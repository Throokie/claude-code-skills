# -*- coding: utf-8 -*-
"""
暗号服务模块
智能暗号分配：四位数字暗号池，保证不重复且相似度低
"""
import random
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Set
from difflib import SequenceMatcher
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.database import CodeWord, Order

logger = logging.getLogger(__name__)


class CodeWordService:
    """暗号服务"""

    # 四位数字范围
    MIN_CODE = 1000
    MAX_CODE = 9999

    async def get_available_code_words(
        self,
        session: AsyncSession,
        code_word_type: str = "blessing"
    ) -> List[CodeWord]:
        """获取可用的暗号列表"""
        result = await session.exec(
            select(CodeWord)
            .where(CodeWord.is_active == True)
            .where(CodeWord.type == code_word_type)
        )
        return list(result.all())

    async def get_recent_used_words(
        self,
        session: AsyncSession,
        days: int = 3
    ) -> Set[str]:
        """获取最近N天已使用的暗号"""
        since = datetime.now() - timedelta(days=days)
        result = await session.exec(
            select(Order)
            .where(Order.code_word.isnot(None))
            .where(Order.ticketed_at >= since)
        )
        orders = list(result.all())
        return {o.code_word for o in orders if o.code_word}

    async def get_active_order_words(
        self,
        session: AsyncSession
    ) -> Set[str]:
        """获取未取票订单的暗号（已出票但未完成）"""
        result = await session.exec(
            select(Order)
            .where(Order.status == "ticketed")
            .where(Order.code_word.isnot(None))
        )
        orders = list(result.all())
        return {o.code_word for o in orders if o.code_word}

    def calculate_similarity(self, word1: str, word2: str) -> float:
        """计算两个暗号的相似度"""
        return SequenceMatcher(None, word1, word2).ratio()

    def is_similar_to_any(self, word: str, existing_words: Set[str], threshold: float = 0.7) -> bool:
        """检查暗号是否与已有暗号相似度过高"""
        for existing in existing_words:
            if self.calculate_similarity(word, existing) >= threshold:
                return True
        return False

    def levenshtein_distance(self, s1: str, s2: str) -> int:
        """计算编辑距离"""
        if len(s1) < len(s2):
            return self.levenshtein_distance(s2, s1)
        if len(s2) == 0:
            return len(s1)

        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    async def assign_code_word(
        self,
        session: AsyncSession,
        code_word_type: str = "number",
        prefer_word: Optional[str] = None
    ) -> Optional[str]:
        """
        智能分配暗号

        规则：
        1. 使用四位数字（1000-9999）
        2. 不与最近3天分配的暗号重复
        3. 不与未取票订单的暗号重复
        4. 编辑距离>=2（保证差异度）
        """
        # 获取排除列表
        recent_words = await self.get_recent_used_words(session, days=3)
        active_words = await self.get_active_order_words(session)
        excluded_words = recent_words | active_words

        # 如果指定了偏好暗号
        if prefer_word:
            if prefer_word not in excluded_words:
                return prefer_word
            logger.warning(f"偏好暗号 {prefer_word} 已被使用，自动分配其他暗号")

        # 从四位数字池中选择
        code_word = await self.select_from_number_pool(session, excluded_words)
        if code_word:
            return code_word

        logger.warning("没有可用的暗号")
        return None

    async def select_from_number_pool(
        self,
        session: AsyncSession,
        excluded_words: Set[str]
    ) -> Optional[str]:
        """
        从四位数字池（1000-9999）中选择暗号

        自动避开：
        - 已在排除列表中的数字
        - 编辑距离<2的数字
        """
        # 获取已使用的数字
        result = await session.exec(
            select(CodeWord).where(CodeWord.type == "number")
        )
        existing_numbers = {cw.word for cw in result.all()}
        excluded_words |= existing_numbers

        # 尝试找到一个可用的数字
        max_attempts = 100
        for _ in range(max_attempts):
            # 生成随机四位数字
            num = random.randint(self.MIN_CODE, self.MAX_CODE)
            word = str(num)

            # 检查是否在排除列表中
            if word in excluded_words:
                continue

            # 检查编辑距离（与所有排除列表中的数字比较）
            is_valid = True
            for existing in excluded_words:
                if existing.isdigit() and len(existing) == 4:
                    if self.levenshtein_distance(word, existing) < 2:
                        is_valid = False
                        break

            if is_valid:
                return word

        return None

    async def generate_unique_number(
        self,
        session: AsyncSession,
        excluded_words: Set[str],
        digits: int = 4
    ) -> Optional[str]:
        """生成唯一的数字暗号（四位数字）"""
        return await self.select_from_number_pool(session, excluded_words)

    async def generate_number_pool(
        self,
        session: AsyncSession,
        count: int = 20,
        digits: str = "4"
    ) -> List[str]:
        """
        生成随机数字暗号池（四位数字）

        Args:
            count: 生成数量
            digits: 只支持 "4"（四位数字）
        """
        # 获取排除列表
        recent_words = await self.get_recent_used_words(session, days=3)
        active_words = await self.get_active_order_words(session)
        excluded_words = recent_words | active_words

        # 获取已有数字暗号
        result = await session.exec(
            select(CodeWord).where(CodeWord.type == "number")
        )
        existing = {cw.word for cw in result.all()}
        excluded_words |= existing

        generated = []
        attempts = 0
        max_attempts = count * 10

        while len(generated) < count and attempts < max_attempts:
            attempts += 1

            word = await self.select_from_number_pool(session, excluded_words | set(generated))

            if word:
                generated.append(word)
                excluded_words.add(word)

        return generated

    async def get_usage_stats(self, session: AsyncSession) -> dict:
        """获取暗号使用统计"""
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_start = today_start - timedelta(days=now.weekday())

        # 总暗号数
        result = await session.exec(select(CodeWord))
        total_words = len(list(result.all()))

        # 今日使用
        result = await session.exec(
            select(Order)
            .where(Order.ticketed_at >= today_start)
            .where(Order.code_word.isnot(None))
        )
        used_today = len(list(result.all()))

        # 本周使用
        result = await session.exec(
            select(Order)
            .where(Order.ticketed_at >= week_start)
            .where(Order.code_word.isnot(None))
        )
        used_week = len(list(result.all()))

        # 未取票订单
        result = await session.exec(
            select(Order).where(Order.status == "ticketed")
        )
        active_orders = len(list(result.all()))

        # 最近使用的暗号
        result = await session.exec(
            select(Order)
            .where(Order.code_word.isnot(None))
            .order_by(Order.ticketed_at.desc())
            .limit(20)
        )
        recent = [
            {
                "order_no": o.order_no,
                "code_word": o.code_word,
                "code_word_type": o.code_word_type,
                "movie_name": o.movie_name,
                "ticketed_at": o.ticketed_at.isoformat() if o.ticketed_at else None,
                "status": o.status
            }
            for o in result.all()
        ]

        return {
            "total_words": total_words,
            "used_today": used_today,
            "used_week": used_week,
            "active_orders": active_orders,
            "recent": recent,
            "pool_range": f"{self.MIN_CODE}-{self.MAX_CODE}"
        }


# 全局实例
code_word_service = CodeWordService()