from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont
from qrcode.constants import ERROR_CORRECT_Q


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "formatura-da-mara.jpeg"
OUTPUT_PNG = ROOT / "public" / "cartaz-rifa-com-link.png"
OUTPUT_JPEG = ROOT / "public" / "cartaz-rifa-com-link.jpeg"
RAFFLE_URL = "https://wsmelo.github.io/rifa-formatura/#numeros"


def font(filename: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(Path("C:/Windows/Fonts") / filename, size)


source = Image.open(SOURCE).convert("RGB")
footer_height = 210
paper = (247, 238, 231)
ink = (61, 43, 37)
rose = (132, 91, 88)
muted = (112, 88, 79)

canvas = Image.new("RGB", (source.width, source.height + footer_height), paper)
canvas.paste(source, (0, 0))
draw = ImageDraw.Draw(canvas)

draw.line((48, source.height + 1, source.width - 48, source.height + 1), fill=(210, 185, 171), width=2)

qr = qrcode.QRCode(
    version=None,
    error_correction=ERROR_CORRECT_Q,
    box_size=8,
    border=3,
)
qr.add_data(RAFFLE_URL)
qr.make(fit=True)
qr_image = qr.make_image(fill_color=ink, back_color=(255, 251, 247)).convert("RGB")
qr_size = 150
qr_image = qr_image.resize((qr_size, qr_size), Image.Resampling.NEAREST)

qr_x = 48
qr_y = source.height + 30
draw.rounded_rectangle(
    (qr_x - 10, qr_y - 10, qr_x + qr_size + 10, qr_y + qr_size + 10),
    radius=18,
    fill=(255, 251, 247),
    outline=(219, 198, 185),
    width=2,
)
canvas.paste(qr_image, (qr_x, qr_y))

text_x = 238
heading_y = source.height + 30
draw.text((text_x, heading_y), "ACESSE A RIFA ONLINE", font=font("seguisb.ttf", 25), fill=rose)
draw.text((text_x, heading_y + 43), RAFFLE_URL, font=font("segoeui.ttf", 18), fill=ink)
draw.text(
    (text_x, heading_y + 83),
    "Aponte a câmera para o QR Code",
    font=font("segoeui.ttf", 20),
    fill=muted,
)
draw.text(
    (text_x, heading_y + 117),
    "e escolha seus números da sorte.",
    font=font("segoeui.ttf", 20),
    fill=muted,
)

canvas.save(OUTPUT_PNG, optimize=True)
canvas.save(OUTPUT_JPEG, quality=95, optimize=True, subsampling=0)

print(OUTPUT_PNG)
print(OUTPUT_JPEG)
