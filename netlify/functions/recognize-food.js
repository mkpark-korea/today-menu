// netlify/functions/recognize-food.js
// 음식 사진을 받아 Claude API로 메뉴명을 인식하는 서버리스 함수

exports.handler = async function (event) {
  // POST 요청만 허용
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { image, mediaType } = JSON.parse(event.body);

    if (!image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "이미지 데이터가 없습니다." }),
      };
    }

    // 환경변수에서 API 키 읽기 (Netlify 대시보드에서 설정)
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API 키가 설정되지 않았습니다." }),
      };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: "이 사진에 보이는 모든 음식(국, 메인 메뉴, 반찬, 밥, 김치 등)을 한국어로 나열해줘. 각 음식 이름만 공백으로 구분해서 한 줄로 답해. 설명, 번호, 줄바꿈, 쉼표 없이 음식 이름만 공백으로 이어서 답해. 예: 된장찌개 계란말이 시금치나물 김치 콩나물무침",
              },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error.message || "API 호출 오류" }),
      };
    }

    const menuName = data.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    return {
      statusCode: 200,
      body: JSON.stringify({ menuName }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "처리 중 오류가 발생했습니다: " + err.message }),
    };
  }
};
