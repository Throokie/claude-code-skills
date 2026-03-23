#!/usr/bin/env fish
# PreToolUse Hook - Bypass Permissions 模式检查器 v3
# 位置：~/.claude/hooks/pre-tool-use-bypass-check.sh
#
# 策略变更：
# - 不再依赖关键词匹配
# - 基于命令模式分类检测
# - 强制 AI 输出意图声明

# 读取输入
set -l input "$CLAUDE_HOOK_INPUT"
if test -z "$input"
    echo '{"approved": true}'
    exit 0
end

# 提取工具名称和命令
set -l tool_name (echo "$input" | jq -r '.tool.name // ""')
set -l command (echo "$input" | jq -r '.tool.command // .tool.args.command // .tool.input.command // ""')

# 跳过非 Bash 工具
if test "$tool_name" != "Bash"
    echo '{"approved": true}'
    exit 0
end

# 跳过空命令
if test -z "$command"
    echo '{"approved": true}'
    exit 0
end

# ============================================
# 命令模式分类检测（基于命令结构，不是关键词）
# ============================================

set -l block_type ""
set -l block_reason ""
set -l need_user_input false

# --- 1. 破坏性操作检测 ---
# 检测：rm 递归/强制、写入设备、格式化
if string match -qi "rm -rf *" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "rm -rf 递归强制删除 - 必须确认目标和备份"
    set -l need_user_input true
else if string match -qi "rm -r /*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "rm -r 删除根目录内容 - 极度危险"
    set -l need_user_input true
else if string match -qi "rm -rf /*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "rm -rf 删除根目录 - 系统级破坏"
    set -l need_user_input true
else if string match -qi "rm -rf ~/*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "rm -rf 删除用户目录 - 数据丢失风险"
    set -l need_user_input true
else if string match -qi "rm -rf \$HOME/*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "rm -rf 删除 HOME 目录 - 数据丢失风险"
    set -l need_user_input true
else if string match -qi "dd if=*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "dd 磁盘写入操作 - 可能覆盖数据"
    set -l need_user_input true
else if string match -qi "dd of=/dev/*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "dd 写入设备 - 极度危险"
    set -l need_user_input true
else if string match -qi "mkfs*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "mkfs 格式化 - 数据清除"
    set -l need_user_input true
else if string match -qi "fdisk*delete*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "fdisk 删除分区 - 数据清除"
    set -l need_user_input true
else if string match -qi "> /dev/*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "写入设备文件 - 可能损坏系统"
    set -l need_user_input true
else if string match -qi "chmod -R 777 /*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "chmod -R 777 根目录 - 严重安全风险"
    set -l need_user_input true
else if string match -qi "chmod -R 777 /etc*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "chmod -R 777 /etc - 严重安全风险"
    set -l need_user_input true
else if string match -qi "chown -R *" "$command"
    # 只在修改系统目录时拦截
    if string match -qi "* /etc*" "$command"
        set -l block_type "破坏性操作"
        set -l block_reason "chown -R 修改系统目录 - 可能影响系统"
        set -l need_user_input true
    else if string match -qi "* /*" "$command"
        set -l block_type "破坏性操作"
        set -l block_reason "chown -R 根目录 - 严重风险"
        set -l need_user_input true
    end
else if string match -qi "truncate -s*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "truncate 截断文件 - 数据清除"
    set -l need_user_input true
else if string match -qi "echo*>> /etc/*" "$command"
    set -l block_type "破坏性操作"
    set -l block_reason "追加到系统配置 - 可能破坏配置"
    set -l need_user_input true
end

# --- 2. 服务重启检测 ---
# 检测：重启显示管理器、终端、会话管理
if string match -qi "*systemctl*restart*hyprland*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "重启 Hyprland - 会话中断"
    set -l need_user_input true
else if string match -qi "*systemctl*restart*sddm*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "重启 SDDM - 退出登录"
    set -l need_user_input true
else if string match -qi "*systemctl*restart*gdm*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "重启 GDM - 退出登录"
    set -l need_user_input true
else if string match -qi "*systemctl*restart*lightdm*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "重启 LightDM - 退出登录"
    set -l need_user_input true
else if string match -qi "*systemctl*restart*display-manager*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "重启显示管理器 - 退出登录"
    set -l need_user_input true
else if string match -qi "reboot*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "重启系统 - 中断所有工作"
    set -l need_user_input true
else if string match -qi "shutdown*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "关闭系统 - 中断所有工作"
    set -l need_user_input true
else if string match -qi "pkill*kitty*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "杀死 kitty - 关闭会话"
    set -l need_user_input true
else if string match -qi "killall*kitty*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "杀死 kitty - 关闭会话"
    set -l need_user_input true
else if string match -qi "pkill*tmux*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "杀死 tmux - 中断会话"
    set -l need_user_input true
else if string match -qi "killall*tmux*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "杀死 tmux - 中断会话"
    set -l need_user_input true
else if string match -qi "pkill*firefox*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "杀死 firefox - 关闭浏览器"
    set -l need_user_input true
else if string match -qi "killall*firefox*" "$command"
    set -l block_type "服务重启"
    set -l block_reason "杀死 firefox - 关闭浏览器"
    set -l need_user_input true
end

# --- 3. 网络修改检测 ---
# 检测：防火墙、网络接口、路由
if string match -qi "iptables -F*" "$command"
    set -l block_type "网络修改"
    set -l block_reason "清空防火墙规则 - 可能断连"
    set -l need_user_input true
else if string match -qi "iptables --flush*" "$command"
    set -l block_type "网络修改"
    set -l block_reason "清空防火墙规则 - 可能断连"
    set -l need_user_input true
else if string match -qi "ufw disable*" "$command"
    set -l block_type "网络修改"
    set -l block_reason "禁用防火墙 - 安全风险"
    set -l need_user_input true
else if string match -qi "ufw reset*" "$command"
    set -l block_type "网络修改"
    set -l block_reason "重置防火墙 - 可能影响连接"
    set -l need_user_input true
else if string match -qi "nmcli*disconnect*" "$command"
    set -l block_type "网络修改"
    set -l block_reason "断开网络连接 - 中断会话"
    set -l need_user_input true
else if string match -qi "nmcli*down*" "$command"
    set -l block_type "网络修改"
    set -l block_reason "禁用网络连接 - 中断会话"
    set -l need_user_input true
else if string match -qi "ip link set*down*" "$command"
    set -l block_type "网络修改"
    set -l block_reason "禁用网络接口 - 中断连接"
    set -l need_user_input true
else if string match -qi "ip route del*" "$command"
    set -l block_type "网络修改"
    set -l block_reason "删除路由 - 可能断网"
    set -l need_user_input true
else if string match -qi "systemctl stop network*" "$command"
    set -l block_type "网络修改"
    set -l block_reason "停止网络服务 - 中断连接"
    set -l need_user_input true
end

# --- 4. Git 危险操作检测 ---
# 检测：硬重置、强制推送、清理
if string match -qi "git reset --hard*" "$command"
    set -l block_type "Git 危险操作"
    set -l block_reason "git reset --hard - 丢失未提交更改"
    set -l need_user_input true
else if string match -qi "git reset --hard HEAD~*" "$command"
    set -l block_type "Git 危险操作"
    set -l block_reason "git reset --hard 回退 - 丢失提交"
    set -l need_user_input true
else if string match -qi "git clean -fd*" "$command"
    set -l block_type "Git 危险操作"
    set -l block_reason "git clean -fd - 删除未跟踪文件"
    set -l need_user_input true
else if string match -qi "git push*--force*" "$command"
    set -l block_type "Git 危险操作"
    set -l block_reason "git push --force - 覆盖远程历史"
    set -l need_user_input true
else if string match -qi "git push*-f*" "$command"
    set -l block_type "Git 危险操作"
    set -l block_reason "git push -f - 覆盖远程历史"
    set -l need_user_input true
else if string match -qi "git branch -D*" "$command"
    set -l block_type "Git 危险操作"
    set -l block_reason "git branch -D - 强制删除分支"
    set -l need_user_input true
end

# --- 5. Docker 危险操作检测 ---
# 检测：大规模清理、强制删除
if string match -qi "docker prune -a*" "$command"
    set -l block_type "Docker 危险操作"
    set -l block_reason "docker prune -a - 删除所有未使用资源"
    set -l need_user_input true
else if string match -qi "docker system prune -a*" "$command"
    set -l block_type "Docker 危险操作"
    set -l block_reason "docker system prune -a - 删除所有未使用资源"
    set -l need_user_input true
else if string match -qi "docker rm -f*" "$command"
    set -l block_type "Docker 危险操作"
    set -l block_reason "docker rm -f - 强制删除运行中容器"
    set -l need_user_input true
else if string match -qi "docker rmi -f*" "$command"
    set -l block_type "Docker 危险操作"
    set -l block_reason "docker rmi -f - 强制删除镜像"
    set -l need_user_input true
end

# --- 6. sudo 提权操作检测 ---
# 检测：sudo 执行危险命令
if string match -qi "sudo rm -rf*" "$command"
    set -l block_type "sudo 危险操作"
    set -l block_reason "sudo rm -rf - 提权删除"
    set -l need_user_input true
else if string match -qi "sudo systemctl stop*" "$command"
    set -l block_type "sudo 危险操作"
    set -l block_reason "sudo 停止服务"
    set -l need_user_input true
end

# ============================================
# 如果需要用户介入，阻止执行并返回详细消息
# ============================================
if test "$need_user_input" = true
    echo "{
    \"approved\": false,
    \"reason\": \"⚠️  检测到 [$block_type]

🚨 Bypass Permissions 模式规范：
$block_reason

📋 请输出意图声明：
---
📋 意图声明
**操作类型**: $block_type
**风险等级**: ⚠️ 中 / 🔴 高
**执行命令**: \`$command\`
**预期结果**: ...
**潜在影响**: ...
**回滚方案**: ...
---

是否继续？[Y/n]\"
}"
    exit 1
end

# ============================================
# 默认通过 - 但提醒 AI 如果是方案变更需要声明
# ============================================

# 检测是否是方案变更意图（宽松匹配，不拦截只提醒）
if string match -qi "*放弃*" "$command"
    # 不拦截，但让 AI 知道需要声明
    echo "{
    \"approved\": true,
    \"message\": \"⚠️  检测到方案变更意图。

📋 请在执行前输出意图声明：
---
📋 意图声明
**操作类型**: 方案变更
**变更原因**: ...
**新方案**: ...
**预期结果**: ...
---

是否继续？[Y/n]\"
}"
    exit 0
end

# 默认通过
echo '{"approved": true}'
exit 0
