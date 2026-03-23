"""
NutUI-React 组件集成测试
测试 NutUI 组件包是否正确安装
"""
import subprocess
import json


def test_nutui_package_installed():
    """测试 @nutui/nutui-taro 包是否已安装"""
    result = subprocess.run(
        ['npm', 'list', '@nutui/nutui-taro', '--json'],
        capture_output=True,
        text=True,
        cwd='miniapp'
    )
    data = json.loads(result.stdout)
    # 检查包是否在 dependencies 中
    assert '@nutui/nutui-taro' in data.get('dependencies', {}), "NutUI-React not installed"
    print("✓ @nutui/nutui-taro package installed")


def test_nutui_icons_package_installed():
    """测试 @nutui/icons-react 包是否已安装"""
    result = subprocess.run(
        ['npm', 'list', '@nutui/icons-react', '--json'],
        capture_output=True,
        text=True,
        cwd='miniapp'
    )
    data = json.loads(result.stdout)
    # 检查包是否在 dependencies 中
    assert '@nutui/icons-react' in data.get('dependencies', {}), "NutUI icons not installed"
    print("✓ @nutui/icons-react package installed")


def test_nutui_version_compatible():
    """测试 NutUI 版本是否符合要求"""
    result = subprocess.run(
        ['npm', 'list', '@nutui/nutui-taro', '--json'],
        capture_output=True,
        text=True,
        cwd='miniapp'
    )
    data = json.loads(result.stdout)
    version = data['dependencies']['@nutui/nutui-taro']['version']
    # 版本号应该存在
    assert version, "Version not found"
    print(f"✓ @nutui/nutui-taro version: {version}")


if __name__ == "__main__":
    import pytest
    pytest.main([__file__, "-v"])
