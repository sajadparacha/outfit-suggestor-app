#!/usr/bin/env python3
"""Generate a LinkedIn-ready PDF from the multi-agent redesign article."""

from __future__ import annotations

import re
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "linkedin-multi-agent-redesign-2026-06-06.md"
OUTPUT = ROOT / "linkedin-multi-agent-redesign-2026-06-06.pdf"

# Brand colors
NAVY = (15, 23, 42)
GRADIENT_START = (79, 172, 254)
GRADIENT_END = (196, 113, 237)
TEXT = (30, 41, 59)
MUTED = (100, 116, 139)
ACCENT_GOLD = (198, 163, 79)


class ArticlePDF(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 8, "Outfit Suggestor  |  Multi-Agent Redesign", align="L")
        self.ln(12)

    def footer(self) -> None:
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def cover_page(self, title: str, subtitle: str, author: str, date: str) -> None:
        self.add_page()
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 80, style="F")
        self.set_fill_color(*GRADIENT_START)
        self.rect(0, 78, 210, 4, style="F")
        self.set_fill_color(*GRADIENT_END)
        self.rect(0, 82, 210, 2, style="F")

        self.set_y(28)
        self.set_font("Helvetica", "B", 24)
        self.set_text_color(255, 255, 255)
        self.multi_cell(0, 12, ascii_safe(title), align="C")

        self.ln(6)
        self.set_font("Helvetica", "", 12)
        self.set_text_color(220, 230, 245)
        self.multi_cell(0, 7, ascii_safe(subtitle), align="C")

        self.set_y(105)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(*TEXT)
        self.cell(0, 8, author, align="C")
        self.ln(6)
        self.set_text_color(*MUTED)
        self.cell(0, 8, date, align="C")

        self.set_y(135)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*GRADIENT_START)
        self.cell(0, 8, "Prepared for LinkedIn", align="C")

    def section_heading(self, text: str, level: int = 2) -> None:
        if self.get_y() > 250:
            self.add_page()
        self.ln(4 if level == 2 else 2)
        size = 16 if level == 2 else 13
        color = NAVY if level == 2 else GRADIENT_START
        self.set_font("Helvetica", "B", size)
        self.set_text_color(*color)
        self.set_x(15)
        self.multi_cell(180, 8, ascii_safe(text))
        self.ln(2)

    def body_text(self, text: str) -> None:
        self.set_x(15)
        self.set_font("Helvetica", "", 10.5)
        self.set_text_color(*TEXT)
        self.multi_cell(180, 6, ascii_safe(text))
        self.ln(2)

    def bullet(self, text: str) -> None:
        self.set_x(15)
        self.set_font("Helvetica", "", 10.5)
        self.set_text_color(*TEXT)
        self.cell(8, 6, "-")
        self.multi_cell(172, 6, ascii_safe(text))
        self.ln(1)

    def table_row(self, cols: list[str], header: bool = False) -> None:
        widths = [42, 38, 110]
        if header:
            self.set_font("Helvetica", "B", 9)
            self.set_fill_color(241, 245, 249)
            self.set_text_color(*NAVY)
        else:
            self.set_font("Helvetica", "", 9)
            self.set_text_color(*TEXT)
            self.set_fill_color(255, 255, 255)

        row_h = 8
        x0 = self.get_x()
        y0 = self.get_y()
        if y0 > 270:
            self.add_page()
            y0 = self.get_y()

        for i, (col, w) in enumerate(zip(cols, widths)):
            x = x0 + sum(widths[:i])
            self.set_xy(x, y0)
            self.cell(w, row_h, col[:48], border=1, fill=header)
        self.set_xy(15, y0 + row_h)

    def code_block(self, lines: list[str]) -> None:
        if self.get_y() > 210:
            self.add_page()
        self.set_fill_color(248, 250, 252)
        self.set_font("Courier", "", 8)
        self.set_text_color(51, 65, 85)
        block_h = len(lines) * 5 + 8
        x0 = 15
        y0 = self.get_y()
        self.rect(x0, y0, 180, block_h, style="F")
        self.set_xy(x0 + 4, y0 + 4)
        for line in lines:
            self.cell(0, 5, ascii_safe(line))
            self.ln(5)
        self.set_y(y0 + block_h + 4)

    def highlight_box(self, text: str) -> None:
        if self.get_y() > 250:
            self.add_page()
        self.set_fill_color(239, 246, 255)
        y0 = self.get_y()
        self.set_xy(15, y0)
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(30, 64, 110)
        self.multi_cell(180, 6, ascii_safe(text), fill=True)
        self.ln(4)


def ascii_safe(text: str) -> str:
    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "-",
        "\u2192": "->",
    }
    for src, dst in replacements.items():
        text = text.replace(src, dst)
    return text.encode("ascii", "replace").decode("ascii")


def parse_markdown(path: Path) -> list[tuple[str, str]]:
    """Return list of (block_type, content) tuples."""
    raw = path.read_text(encoding="utf-8")
    blocks: list[tuple[str, str]] = []
    in_code = False
    code_lines: list[str] = []

    for line in raw.splitlines():
        if line.strip().startswith("```"):
            if in_code:
                blocks.append(("code", "\n".join(code_lines)))
                code_lines = []
                in_code = False
            else:
                in_code = True
            continue
        if in_code:
            code_lines.append(line)
            continue

        if not line.strip():
            blocks.append(("blank", ""))
            continue
        if line.startswith("# "):
            blocks.append(("h1", line[2:].strip()))
        elif line.startswith("## "):
            blocks.append(("h2", line[3:].strip()))
        elif line.startswith("### "):
            blocks.append(("h3", line[4:].strip()))
        elif line.startswith("|") and "|" in line[1:]:
            blocks.append(("table", line))
        elif line.startswith("- "):
            blocks.append(("bullet", line[2:].strip()))
        elif line.startswith("**#") or line.startswith("#AI"):
            blocks.append(("tags", line.strip()))
        elif line.startswith("---"):
            blocks.append(("hr", ""))
        elif line.startswith("*") and line.endswith("*"):
            blocks.append(("italic", line.strip("* ").strip()))
        else:
            cleaned = re.sub(r"\*\*(.+?)\*\*", r"\1", line)
            cleaned = re.sub(r"\*(.+?)\*", r"\1", cleaned)
            cleaned = cleaned.replace("`", "")
            blocks.append(("p", ascii_safe(cleaned)))

    return blocks


def build_pdf() -> None:
    blocks = parse_markdown(SOURCE)

    pdf = ArticlePDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.set_margins(15, 15, 15)

    title = "Redesigning a Cross-Platform App with Multi-Agent AI in One Day"
    subtitle = (
        "How parallel AI agents in Cursor shipped a coordinated web + iOS "
        "home-page redesign with full test coverage"
    )
    pdf.cover_page(
        title=title,
        subtitle=subtitle,
        author="Sajad Paracha",
        date="June 6, 2026",
    )

    pdf.add_page()
    table_header_done = False

    for kind, content in blocks:
        if kind in ("h1", "hr", "blank"):
            continue
        if kind == "h2":
            table_header_done = False
            pdf.section_heading(ascii_safe(content), level=2)
        elif kind == "h3":
            pdf.section_heading(ascii_safe(content), level=3)
        elif kind == "p":
            if content.startswith("Live app:"):
                pdf.highlight_box(content)
            else:
                pdf.body_text(content)
        elif kind == "bullet":
            pdf.bullet(ascii_safe(content))
        elif kind == "code":
            pdf.code_block(content.splitlines())
        elif kind == "table":
            if "---" in content:
                continue
            cols = [ascii_safe(c.strip()) for c in content.strip("|").split("|")]
            is_header = not table_header_done and any(
                h in content for h in ("Agent", "Scope", "Mission")
            )
            pdf.table_row(cols, header=is_header)
            if is_header:
                table_header_done = True
        elif kind == "tags":
            pdf.set_x(15)
            pdf.ln(4)
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*GRADIENT_END)
            pdf.multi_cell(180, 5, ascii_safe(content))
        elif kind == "italic":
            pdf.set_x(15)
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(*MUTED)
            pdf.multi_cell(180, 6, ascii_safe(content))
            pdf.ln(2)

    pdf.output(OUTPUT)
    print(f"Created: {OUTPUT}")


if __name__ == "__main__":
    build_pdf()
