/***************************************************************
 * 0) 상태
 ***************************************************************/
let currentVerse = "";
let currentVerseLines = [];

/***************************************************************
 * 1) 랜덤 구절
 ***************************************************************/
function getRandomMessage() {
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

/***************************************************************
 * 2) 한국어 줄바꿈(안정형)
 ***************************************************************/
function wrapTextKoreanSafe(ctx, text, maxWidth) {
  const lines = [];
  let line = "";

  const words = text.split(/\s+/).filter(Boolean);
  const useWordMode = words.length > 1;
  const units = useWordMode ? words : Array.from(text);

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const testLine = line ? (useWordMode ? `${line} ${u}` : `${line}${u}`) : u;

    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
      continue;
    }

    // 아주 긴 토큰(단어) 대응: 글자 단위로 강제 분해
    if (!line) {
      const chars = Array.from(u);
      let chunk = "";
      for (const ch of chars) {
        const t = chunk + ch;
        if (ctx.measureText(t).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk = t;
        }
      }
      if (chunk) lines.push(chunk);
      line = "";
      continue;
    }

    lines.push(line);
    line = u;
  }

  if (line) lines.push(line);
  return lines;
}

/***************************************************************
 * 3) 화면에 "처음부터" 줄바꿈 적용
 ***************************************************************/
function setNewVerse() {
  currentVerse = getRandomMessage();

  const verseEl = document.getElementById("verseText");
  if (!verseEl) return;

  // 측정용 캔버스
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");

  // 화면 폰트와 동일하게 맞춰야 줄바꿈이 안 깨짐
  const style = getComputedStyle(verseEl);
  ctx.font =
    style.font && style.font !== "normal"
      ? style.font
      : `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

  // verseText의 실제 폭 기준
  const rect = verseEl.getBoundingClientRect();
  const maxWidth = rect.width * 0.92;

  currentVerseLines = wrapTextKoreanSafe(ctx, currentVerse, maxWidth);

  // 화면에 줄바꿈 반영 (CSS에 white-space: pre-line 필요)
  verseEl.textContent = currentVerseLines.join("\n");
}

/***************************************************************
 * 4) 다운로드(PNG)
 * - 배경은 반드시 <img class="postcard-background" src="./cardback.png"> 형태여야 함
 ***************************************************************/
async function downloadBackAsPNG() {
  const backImg = document.querySelector(".card-back .postcard-background");
  const verseEl = document.getElementById("verseText");

  if (!backImg) {
    console.error("뒷면 배경 이미지(.postcard-background)를 찾을 수 없습니다.");
    return;
  }

  // 화면에 보이는 줄바꿈 그대로 사용
  const textToDraw = (verseEl?.textContent || "").trim();
  const linesToDraw = textToDraw
    ? textToDraw.split("\n")
    : (currentVerseLines.length ? currentVerseLines : ["말씀을 먼저 뽑아주세요 🙂"]);

  // 이미지 로드 보장
  if (!backImg.complete) {
    await new Promise((res, rej) => {
      backImg.onload = res;
      backImg.onerror = rej;
    });
  }
  if (backImg.decode) {
    try { await backImg.decode(); } catch (e) {}
  }

  // 폰트 로드 보장 (여기 폰트명은 실제 사용 폰트로 맞추세요)
  try {
    // 예: Ownglyph_ryurue-Rg를 쓰면 아래도 동일하게
    await document.fonts.load("20px Ownglyph_ryurue-Rg");
    await document.fonts.ready;
  } catch (e) {}

  const w = backImg.naturalWidth || 1200;
  const h = backImg.naturalHeight || 1680;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // 배경
  ctx.drawImage(backImg, 0, 0, w, h);

  // 텍스트 스타일
  ctx.fillStyle = "rgb(46, 65, 114)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const fontSize = Math.round(w * 0.05);
  ctx.font = `bold ${fontSize}px Ownglyph_ryurue-Rg`;

  // 중앙 배치
  const lineHeight = Math.round(fontSize * 1.35);
  const blockHeight = linesToDraw.length * lineHeight;
  let y = Math.round(h * 0.5 - blockHeight / 2);

  for (const line of linesToDraw) {
    ctx.fillText(line, Math.round(w / 2), y);
    y += lineHeight;
  }

  // 하단 계정명(원하시면 유지)
  ctx.font = `bold ${Math.round(fontSize * 0.75)}px Ownglyph_ryurue-Rg`;
  ctx.fillText("@holy_chariot", Math.round(w / 2), Math.round(h * 0.78));

  // ✅ 다운로드: toBlob (안정적)
  canvas.toBlob((blob) => {
    if (!blob) {
      console.error("PNG blob 생성 실패");
      return;
    }
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.download = "verse-card.png";
    a.href = url;

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }, "image/png");
}

/***************************************************************
 * 5) 이벤트
 ***************************************************************/
window.addEventListener("DOMContentLoaded", () => {
  const card = document.getElementById("postcard");
  const downloadBtn = document.getElementById("downloadBtn");

  setNewVerse();

  if (card) {
    card.addEventListener("click", () => {
      card.classList.toggle("is-flipped"); // 클릭 시 구절 유지
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      downloadBackAsPNG();
    });
  }
});
