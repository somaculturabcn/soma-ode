# src/utils/generateDossierPDF.py

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

def generate_pdf(artist, filename="dossier.pdf"):
    doc = SimpleDocTemplate(filename)
    styles = getSampleStyleSheet()

    content = []

    content.append(Paragraph(f"<b>{artist['name']}</b>", styles["Title"]))
    content.append(Spacer(1, 12))

    content.append(Paragraph("<b>Bio</b>", styles["Heading2"]))
    content.append(Paragraph(artist.get("bio", "—"), styles["BodyText"]))
    content.append(Spacer(1, 12))

    content.append(Paragraph("<b>Disciplinas</b>", styles["Heading2"]))
    content.append(Paragraph(", ".join(artist.get("disciplines", [])), styles["BodyText"]))
    content.append(Spacer(1, 12))

    content.append(Paragraph("<b>Proyectos</b>", styles["Heading2"]))
    for p in artist.get("projects", []):
        content.append(Paragraph(f"- {p['name']}: {p.get('summary','')}", styles["BodyText"]))

    content.append(Spacer(1, 12))

    content.append(Paragraph("<b>Contacto</b>", styles["Heading2"]))
    content.append(Paragraph(artist.get("email", ""), styles["BodyText"]))

    doc.build(content)