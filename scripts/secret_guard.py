#!/usr/bin/env python3
import re
import subprocess
import sys

# 高置信度密钥模式
HARD_SECRET_PATTERNS = [
    ("OpenAI key", re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b")),
    ("Anthropic key", re.compile(r"\bsk-ant-[A-Za-z0-9_-]{20,}\b")),
    ("GitHub token", re.compile(r"\b(?:ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b")),
    ("AWS access key", re.compile(r"\bAKIA[0-9A-Z]{16}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
    ("Bearer token", re.compile(r"\bBearer\s+[A-Za-z0-9._=-]{20,}\b", re.I)),
]

SENSITIVE_NAME = re.compile(r"(?i)(api[_-]?key|token|secret|password|passwd|authorization)")
ASSIGN = re.compile(r"[:=]\s*['\"]?([^'\"\s,;]+)")
SENSITIVE_URL = re.compile(r"(?i)(base[_-]?url|api[_-]?url|endpoint|database[_-]?url|proxy[_-]?url)")
URL = re.compile(r"https?://[^\s'\"]+")

SAFE_URL_HINTS = ("example.com", "localhost", "127.0.0.1", "0.0.0.0", "::1")
SAFE_VALUES = {
    "your-password",
    "your_password",
    "your-token",
    "your_token",
    "changeme",
    "example",
    "example-key",
    "example_token",
    "stackpass",  # 本地示例默认密码
    "******",
}

ALLOWLIST_FILES = {
    "scripts/secret_guard.py",  # 规则自身会包含 token/api_key 字样
}


def run(cmd):
    return subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL)


def staged_files():
    out = run(["git", "diff", "--cached", "--name-only", "--diff-filter=ACMR"])
    return [x.strip() for x in out.splitlines() if x.strip()]


def _is_likely_real_secret(val: str) -> bool:
    v = val.strip().strip('"\'')
    if not v:
        return False
    lv = v.lower()

    # 忽略环境变量/模板/占位符
    if "process.env" in lv or "${" in v or lv.startswith("env."):
        return False
    if v.startswith("<") and v.endswith(">"):
        return False
    if set(v) == {"*"}:
        return False
    if lv in SAFE_VALUES:
        return False

    # 纯字母短串不当作密钥
    if len(v) < 12:
        return False
    if re.fullmatch(r"[A-Za-z]+", v):
        return False

    return True


def _scan_added_line(content: str):
    hits = []

    for name, pat in HARD_SECRET_PATTERNS:
        if pat.search(content):
            hits.append((name, content[:220]))

    # 敏感变量名 + 字面量赋值
    if SENSITIVE_NAME.search(content):
        m = ASSIGN.search(content)
        if m:
            val = m.group(1)
            if _is_likely_real_secret(val):
                hits.append(("Sensitive assignment", content[:220]))

    # 敏感 URL 字段的字面量 URL
    if SENSITIVE_URL.search(content):
        m = URL.search(content)
        if m:
            u = m.group(0).lower()
            if not any(h in u for h in SAFE_URL_HINTS):
                hits.append(("Sensitive URL assignment", content[:220]))

    # URL query 带凭证
    if URL.search(content) and re.search(r"(?i)(api[_-]?key|token|secret|password)=", content):
        hits.append(("URL with credential query", content[:220]))

    return hits


def scan_diff_text(diff_text: str):
    problems = []
    current_file = None
    for line in diff_text.splitlines():
        if line.startswith("+++ b/"):
            current_file = line[6:]
            continue
        if not line.startswith("+") or line.startswith("+++"):
            continue

        if current_file in ALLOWLIST_FILES:
            continue

        content = line[1:]
        for kind, snippet in _scan_added_line(content):
            problems.append((current_file or "<unknown>", kind, snippet))

    return problems


def scan_staged_diff():
    diff = run(["git", "diff", "--cached", "--unified=0", "--no-color"])
    return scan_diff_text(diff)


def scan_outgoing_commits():
    # 仅扫即将 push 的新增提交，避免旧历史遗留噪声
    try:
        upstream = run(["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).strip()
        diff = run(["git", "diff", "--unified=0", "--no-color", f"{upstream}..HEAD"])
    except Exception:
        # 无上游时，扫描最近一次提交
        try:
            diff = run(["git", "show", "--unified=0", "--no-color", "HEAD"])
        except Exception:
            diff = ""
    return scan_diff_text(diff)


def block_env(files):
    blocked = []
    for f in files:
        name = f.split("/")[-1]
        if name.startswith(".env") and name != ".env.example":
            blocked.append(f)
    return blocked


def report_and_exit(problems, mode):
    if problems:
        print("\n[secret-guard] ❌ 检测到潜在敏感信息，已阻止。", file=sys.stderr)
        for f, kind, content in problems[:40]:
            print(f"  - {f} [{kind}] {content}", file=sys.stderr)
        print("\n处理建议：改用环境变量、占位符（example.com/localhost）或移除明文凭证。", file=sys.stderr)
        return 1

    print(f"[secret-guard] ✅ pass ({mode})")
    return 0


def main():
    mode = "staged"
    if len(sys.argv) > 1:
        mode = sys.argv[1]

    files = staged_files()
    env_hits = block_env(files)
    if env_hits:
        print("\n[secret-guard] ❌ 阻止提交：检测到 .env 类文件被提交", file=sys.stderr)
        for f in env_hits:
            print(f"  - {f}", file=sys.stderr)
        print("请改用 .env.example（仅变量名）", file=sys.stderr)
        return 1

    if mode == "outgoing":
        return report_and_exit(scan_outgoing_commits(), mode)

    return report_and_exit(scan_staged_diff(), mode)


if __name__ == "__main__":
    sys.exit(main())
