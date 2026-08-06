const INDICATORS = [
  {
    key: "comprehension",
    name: "내용 이해",
    weight: 0.25,
    description: "글의 핵심 내용과 줄거리를 정확히 파악하는 능력",
    source: "PISA Reading - locate and understand"
  },
  {
    key: "inference",
    name: "추론/해석",
    weight: 0.2,
    description: "명시되지 않은 의미를 연결해 해석하고 원인-결과를 추론하는 능력",
    source: "PISA Reading - integrate and interpret"
  },
  {
    key: "criticalThinking",
    name: "비판/평가",
    weight: 0.2,
    description: "인물, 사건, 가치에 대해 근거를 들어 판단하고 비교하는 능력",
    source: "NAEP Reading - critique and evaluate"
  },
  {
    key: "expression",
    name: "표현/구성",
    weight: 0.2,
    description: "생각을 문장과 단락으로 논리적으로 조직해 전달하는 능력",
    source: "국어과 성취기준 - 쓰기 조직"
  },
  {
    key: "vocabGrammar",
    name: "어휘/문장 사용",
    weight: 0.15,
    description: "어휘 다양성과 문장 사용의 적절성",
    source: "국어과 성취기준 - 어휘와 문법"
  }
];

const CONNECTIVES = ["왜냐하면", "그래서", "하지만", "반면", "따라서", "그러나", "또한"];
const EVALUATIVE_WORDS = ["좋", "아쉽", "교훈", "배웠", "의미", "중요", "필요"];
const REFLECTIVE_WORDS = ["느꼈", "생각", "깨달", "알게", "다짐"];

function clampScore(score) {
  return Math.max(1, Math.min(5, Math.round(score)));
}

function basicTextStats(text) {
  const normalized = (text || "").trim();
  const sentences = normalized.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  const words = normalized.split(/\s+/).map((w) => w.trim()).filter(Boolean);
  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));

  return {
    normalized,
    sentenceCount: sentences.length,
    wordCount: words.length,
    uniqueWordCount: uniqueWords.size,
    avgSentenceLength: sentences.length ? words.length / sentences.length : 0
  };
}

function countKeywordHits(text, keywords) {
  return keywords.reduce((acc, word) => (text.includes(word) ? acc + 1 : acc), 0);
}

function evaluateReflection(reflectionText) {
  const stats = basicTextStats(reflectionText);
  const text = stats.normalized;

  const lengthFactor = Math.min(2.2, stats.wordCount / 60);
  const structureFactor = Math.min(2.0, stats.sentenceCount / 5);
  const diversityFactor = stats.wordCount > 0 ? (stats.uniqueWordCount / stats.wordCount) * 2.2 : 0;

  const connectiveHits = countKeywordHits(text, CONNECTIVES);
  const evaluativeHits = countKeywordHits(text, EVALUATIVE_WORDS);
  const reflectiveHits = countKeywordHits(text, REFLECTIVE_WORDS);

  const scores = {
    comprehension: clampScore(1 + lengthFactor + (stats.wordCount > 35 ? 0.8 : 0)),
    inference: clampScore(1 + structureFactor * 0.8 + connectiveHits * 0.7),
    criticalThinking: clampScore(1 + evaluativeHits * 0.9 + connectiveHits * 0.4),
    expression: clampScore(1 + structureFactor + (stats.avgSentenceLength >= 6 ? 0.8 : 0)),
    vocabGrammar: clampScore(1 + diversityFactor + (stats.avgSentenceLength <= 25 ? 0.5 : 0))
  };

  const weightedTotal = INDICATORS.reduce((total, indicator) => {
    const score = scores[indicator.key] || 1;
    return total + score * 20 * indicator.weight;
  }, 0);

  const totalScore = Math.round(weightedTotal);

  const feedback = {
    comprehension:
      scores.comprehension >= 4
        ? "책의 핵심 내용을 비교적 분명하게 전달했어요."
        : "줄거리나 핵심 사건을 조금 더 구체적으로 써보면 좋아요.",
    inference:
      scores.inference >= 4
        ? "원인과 결과를 연결해 해석하려는 시도가 좋아요."
        : "왜 그렇게 느꼈는지 이유를 연결어와 함께 써보세요.",
    criticalThinking:
      scores.criticalThinking >= 4
        ? "장점과 아쉬운 점을 근거와 함께 판단했어요."
        : "인물이나 사건에 대한 자신의 판단 근거를 더 써보세요.",
    expression:
      scores.expression >= 4
        ? "문장을 이어 생각을 비교적 자연스럽게 구성했어요."
        : "도입-내용-마무리 순서로 나누어 쓰면 더 읽기 쉬워요.",
    vocabGrammar:
      scores.vocabGrammar >= 4
        ? "어휘 사용이 다양하고 문장 길이도 적절해요."
        : "비슷한 말 반복을 줄이고 다양한 표현을 써보세요."
  };

  return {
    totalScore,
    scores,
    feedback,
    stats
  };
}

module.exports = {
  INDICATORS,
  evaluateReflection
};
