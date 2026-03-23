# -*- coding: utf-8 -*-
"""
座位图 AI 解析服务
使用视觉大模型分析猫眼/淘票票选座截图，提取座位信息
"""
import base64
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import httpx

logger = logging.getLogger(__name__)


class SeatAnalyzer:
    """座位图分析器"""

    def __init__(self, api_key: Optional[str] = None, model: str = "qwen-vl-max"):
        self.api_key = api_key
        self.model = model
        # 使用 DashScope API 进行视觉分析
        self.api_url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"

    async def analyze_seat_image(self, image_path: str) -> Optional[Dict[str, Any]]:
        """
        分析座位截图，提取座位信息

        Args:
            image_path: 截图文件路径

        Returns:
            {
                "cinema_name": "中影魅影国际影城",
                "hall": "6 号厅",
                "movie_name": "河狸变身计划",
                "show_time": "17:45",
                "seats": [
                    {"row": 5, "col": 5, "price": 33},
                    {"row": 4, "col": 6, "price": 33},
                    {"row": 5, "col": 7, "price": 33}
                ],
                "total_price": 99,
                "seat_labels": ["5 排 05 座", "4 排 06 座", "5 排 07 座"]
            }
        """
        try:
            # 读取图片并转为 base64
            with open(image_path, 'rb') as f:
                image_data = base64.b64encode(f.read()).decode('utf-8')

            # 构建提示词
            prompt = """
请分析这张猫眼/淘票票选座截图，提取以下信息：

1. 影院名称（顶部标题）
2. 电影名称
3. 放映时间（日期和时间）
4. 已选座位列表，格式：排号、座号、单价
5. 总价

请以 JSON 格式返回，格式如下：
{
    "cinema_name": "影院名称",
    "movie_name": "电影名称",
    "show_date": "YYYY-MM-DD",
    "show_time": "HH:MM",
    "hall": "X 号厅",
    "seats": [
        {"row": 5, "col": 5, "price": 33, "label": "5 排 05 座"}
    ],
    "total_price": 99
}

如果没有识别到座位信息，返回 null。
"""

            # 调用视觉 API
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            payload = {
                "model": self.model,
                "input": {
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"image": f"data:image/jpeg;base64,{image_data}"},
                                {"text": prompt}
                            ]
                        }
                    ]
                }
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(self.api_url, json=payload, headers=headers)
                response.raise_for_status()
                result = response.json()

                # 解析返回的 JSON
                import json
                content = result.get('choices', [{}])[0].get('message', {}).get('content', '')

                # 提取 JSON 部分
                if '```json' in content:
                    json_str = content.split('```json')[1].split('```')[0].strip()
                else:
                    json_str = content

                data = json.loads(json_str)
                return data

        except Exception as e:
            logger.error(f"分析座位图失败：{e}")
            return None

    def parse_seat_labels(self, seat_labels: List[str]) -> List[Dict[str, int]]:
        """
        解析座位标签字符串

        Args:
            seat_labels: ["5 排 05 座", "4 排 06 座"]

        Returns:
            [{"row": 5, "col": 5}, {"row": 4, "col": 6}]
        """
        import re
        seats = []

        for label in seat_labels:
            match = re.search(r'(\d+) 排 [零 0]?(\d+)(?:座|号)', label)
            if match:
                seats.append({
                    "row": int(match.group(1)),
                    "col": int(match.group(2))
                })

        return seats


# 全局实例
seat_analyzer = SeatAnalyzer()
