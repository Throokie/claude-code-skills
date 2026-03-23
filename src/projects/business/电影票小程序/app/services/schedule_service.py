# -*- coding: utf-8 -*-
"""
排期服务模块
从 maoyan 项目获取排期数据
"""
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
from lxml import etree

from app.config import settings

logger = logging.getLogger(__name__)


class ScheduleService:
    """排期服务"""

    def __init__(self):
        self.maoyan_dir = settings.MAOYAN_DIR
        self.config_file = self.maoyan_dir / "config.json"
        self._config_cache = None
        self._config_mtime = None

    def _load_config(self) -> dict:
        """加载配置（带缓存）"""
        if self.config_file.exists():
            mtime = self.config_file.stat().st_mtime
            if self._config_cache is None or mtime != self._config_mtime:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    self._config_cache = json.load(f)
                    self._config_mtime = mtime
        return self._config_cache or {}

    def get_cinema_config(self, cinema_code: str) -> Dict[str, Any]:
        """获取影院配置"""
        config = self._load_config()
        profiles = config.get("profiles", {})

        # 从第一个 profile 获取影院价格
        for profile in profiles.values():
            settings = profile.get("settings", {})
            if cinema_code in settings.get("selected_cinemas", []):
                prices = profile.get("prices", {})
                price_key = f"{cinema_code}_money"
                return {
                    "price_text": prices.get(price_key, ""),
                    "is_selected": True
                }
        return {"price_text": "", "is_selected": False}

    def parse_html_file(self, cinema_code: str) -> List[Dict[str, Any]]:
        """解析影院 HTML 文件"""
        html_file = self.maoyan_dir / f"{cinema_code}.html"
        if not html_file.exists():
            logger.warning(f"影院 HTML 文件不存在: {html_file}")
            return []

        try:
            with open(html_file, "r", encoding="utf-8") as f:
                html_content = f.read()

            tree = etree.HTML(html_content)
            movies = []

            # 解析电影列表
            movie_elements = tree.xpath("//div[contains(@class, 'movie-item')]")
            if not movie_elements:
                # 尝试其他选择器
                movie_elements = tree.xpath("//div[@class='movie']")

            for movie_el in movie_elements:
                movie = self._parse_movie_element(movie_el, cinema_code)
                if movie:
                    movies.append(movie)

            return movies
        except Exception as e:
            logger.error(f"解析 HTML 失败: {e}")
            return []

    def _parse_movie_element(self, el, cinema_code: str) -> Optional[Dict[str, Any]]:
        """解析单个电影元素"""
        try:
            movie = {}

            # 电影名称
            name_el = el.xpath(".//h3") or el.xpath(".//div[contains(@class, 'movie-name')]")
            if name_el:
                # 使用 .text 而不是 .text_content()
                movie["name"] = name_el[0].text.strip() if name_el[0].text else ""
            else:
                return None

            # 电影信息
            info_el = el.xpath(".//p[contains(@class, 'movie-info')]")
            if info_el:
                movie["info"] = info_el[0].text.strip() if info_el[0].text else ""

            # 场次列表
            shows = []
            show_elements = el.xpath(".//div[contains(@class, 'show-item')]") or el.xpath(".//div[@class='show']")
            for show_el in show_elements:
                show = self._parse_show_element(show_el)
                if show:
                    shows.append(show)

            movie["shows"] = shows
            movie["cinema_code"] = cinema_code

            return movie
        except Exception as e:
            logger.debug(f"解析电影元素失败: {e}")
            return None

    def _parse_show_element(self, el) -> Optional[Dict[str, Any]]:
        """解析场次元素"""
        try:
            show = {}

            # 时间
            time_el = el.xpath(".//span[contains(@class, 'time')]") or el.xpath(".//span[@class='time']")
            if time_el:
                show["time"] = time_el[0].text.strip() if time_el[0].text else ""

            # 影厅
            hall_el = el.xpath(".//span[contains(@class, 'hall')]") or el.xpath(".//span[@class='hall']")
            if hall_el:
                show["hall"] = hall_el[0].text.strip() if hall_el[0].text else ""

            # 价格
            price_el = el.xpath(".//span[contains(@class, 'price')]") or el.xpath(".//span[@class='price']")
            if price_el:
                show["price"] = price_el[0].text.strip() if price_el[0].text else ""

            # 语言
            lang_el = el.xpath(".//span[contains(@class, 'lang')]") or el.xpath(".//span[@class='lang']")
            if lang_el:
                show["lang"] = lang_el[0].text.strip() if lang_el[0].text else ""

            return show if show.get("time") else None
        except Exception as e:
            logger.debug(f"解析场次元素失败: {e}")
            return None

    def get_cinema_schedules(self, cinema_code: str, date: str = "today") -> Dict[str, Any]:
        """获取影院排期"""
        from app.database import Cinema

        # 解析 HTML
        movies = self.parse_html_file(cinema_code)

        # 获取配置
        cinema_config = self.get_cinema_config(cinema_code)

        # 计算日期
        today = datetime.now()
        if date == "today":
            target_date = today.strftime("%Y-%m-%d")
            date_label = f"今天 {today.month}月{today.day}日"
        elif date == "tomorrow":
            tomorrow = today + timedelta(days=1)
            target_date = tomorrow.strftime("%Y-%m-%d")
            date_label = f"明天 {tomorrow.month}月{tomorrow.day}日"
        else:
            target_date = date
            date_label = date

        return {
            "cinema_code": cinema_code,
            "date": target_date,
            "date_label": date_label,
            "movies": movies,
            "price_text": cinema_config.get("price_text", ""),
            "update_time": datetime.now().isoformat()
        }

    def get_all_cinemas(self) -> List[Dict[str, Any]]:
        """获取所有影院列表（从数据库读取）"""
        import asyncio
        from app.database import get_session, Cinema

        cinemas = []

        try:
            # 异步读取数据库
            async def fetch_cinemas():
                async with await get_session() as session:
                    from sqlmodel import select
                    result = await session.exec(select(Cinema).where(Cinema.is_active == True))
                    return result.all()

            # 使用新线程运行异步代码，避免事件循环冲突
            import threading
            result_container = []
            exception_container = []

            def run_async():
                try:
                    result = asyncio.run(fetch_cinemas())
                    result_container.append(result)
                except Exception as e:
                    exception_container.append(e)

            thread = threading.Thread(target=run_async)
            thread.start()
            thread.join()

            if exception_container:
                raise exception_container[0]

            cinema_list = result_container[0] if result_container else []

            for cinema in cinema_list:
                tags = []
                if cinema.tags:
                    try:
                        tags = json.loads(cinema.tags)
                    except:
                        tags = []

                cinemas.append({
                    "code": cinema.code,
                    "name": cinema.name,
                    "maoyan_id": cinema.maoyan_id,
                    "priority": cinema.priority,
                    "tags": tags,
                    "has_data": True,  # 数据库中的影院都视为有数据
                    "manager_contact": cinema.manager_contact
                })
        except Exception as e:
            logger.debug(f"从数据库读取影院失败：{e}，尝试从配置文件读取")
            # 降级到配置文件读取
            return self._get_cinemas_from_config_fallback()

        return cinemas

    def _get_cinemas_from_config_fallback(self) -> List[Dict[str, Any]]:
        """从配置文件读取影院（降级方案）"""
        config = self._load_config()
        profiles = config.get("profiles", {})
        cinemas = []

        # 获取所有影院代码
        all_codes = set()
        for profile in profiles.values():
            settings = profile.get("settings", {})
            for code in settings.get("selected_cinemas", []):
                all_codes.add(code)

        # 影院名称映射
        cinema_names = {
            "jc": "金城影院",
            "hsy": "横店影城",
            "drf": "大地影院",
            "nanxing": "南兴影院",
            "meiying": "美影影院",
            "wanda": "万达广场店",
            "hengda": "恒大影院",
            "huaxia": "华夏影院",
            "lingdong": "灵动影院",
            "xingfu": "幸福影院",
            "biguiyuan": "碧桂园影院",
            "xingmei": "星美影院"
        }

        for code in all_codes:
            html_file = self.maoyan_dir / f"{code}.html"
            cinemas.append({
                "code": code,
                "name": cinema_names.get(code, code.upper()),
                "has_data": html_file.exists(),
                "priority": 0
            })

        return cinemas


# 全局实例
schedule_service = ScheduleService()