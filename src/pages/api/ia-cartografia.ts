export default async function handler(req, res) {
  try {
    const { prompt } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    // ⚠️ MUITO IMPORTANTE
    const content = data.choices[0].message.content;

    res.status(200).json(JSON.parse(content));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro na IA" });
  }
}