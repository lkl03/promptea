// lib/engine/zh.ts
//
// v1.8.7 (engine 2.5.0) — the Chinese (Simplified) vocabulary of the engine's
// detectors, the counterpart of lib/engine/pt.ts.
//
// The detectors (features, signals, classifier, linter) are keyword-based and
// were written for Spanish and English (Portuguese has its own module). Chinese
// is added HERE, in one place, for the same reasons as Portuguese:
//
//   1. No regression for es/en/pt. These patterns are consulted only when the
//      prompt is read as Chinese (`isZh()` below): the interface is Chinese and
//      the prompt is not clearly another language, or the prompt itself is
//      written in Chinese (CJK characters dominate). A Spanish, English or
//      Portuguese prompt never reaches them.
//   2. Chinese has no spaces and no word boundaries: JS `\b` (ASCII) and the
//      Unicode `(?<![\p{L}])` edges used by the other languages never match
//      inside a run of Han characters. Every pattern here is a plain substring
//      alternation; the words chosen are specific enough to stand alone.
//
// Simplified characters only (zh-CN); a few Traditional variants are included
// where a reader from Taiwan or Hong Kong typing in the Chinese interface would
// otherwise lose a signal (資料/资料, 範例/范例…), never as the main spelling.

import type { Lang } from "@/lib/domain";
import { readsAsChinese } from "@/lib/refine/language";

/** Case-insensitive alternation with no word edges (CJK has none). */
function z(alternation: string): RegExp {
  return new RegExp(`(?:${alternation})`, "iu");
}

let lastKey = "";
let lastValue = false;

/** True when `text` should be read with the Chinese vocabulary. */
export function isZh(text: string, lang: Lang | undefined): boolean {
  const ui: Lang = lang ?? "en";
  const key = `${ui}\u0000${text}`;
  if (key === lastKey) return lastValue;
  lastKey = key;
  lastValue = readsAsChinese(text, ui);
  return lastValue;
}

// ---------------------------------------------------------------------------
// Goal
// ---------------------------------------------------------------------------

/** Request verbs and request framings ("请…", "帮我…", "我想…"). */
export const ZH_GOAL_VERBS = z(
  [
    "请|帮我|帮忙|麻烦你|能否|能不能|可以帮|我想|我需要|我希望|我要|目标是|我的目标",
    "写|撰写|编写|改写|重写|润色|起草|创作|生成|制作|设计|画",
    "解释|说明|总结|概括|归纳|翻译|提取|抽取|转换|整理|格式化",
    "修复|修改|调试|排查|重构|实现|迁移|优化|改进|添加|删除|更新|审查|检查",
    "分析|比较|对比|调研|研究|查找|列出|规划|计划|制定|建议|推荐|评估|分类|计算|回答|描述|教我|讲解",
  ].join("|"),
);

export const ZH_GOAL_LABEL = /(?:^|\n)\s*(目标|任务|需求|要求)\s*[:：]/u;

export const ZH_TASK_GOAL: Record<string, RegExp> = {
  summarization: z("总结|摘要|概括|归纳|要点|核心观点"),
  translation: z("翻译|译成|译为|翻成|翻译成"),
  study: z("解释|讲解|教我|帮我理解|学习|复习|备考"),
  marketing: z("广告|文案|营销|推广|宣传|活动|号召性用语"),
  coding: z("代码|函数|修复|调试|重构|实现|编程"),
  debugging: z("代码|函数|修复|调试|重构|实现|报错"),
  refactor: z("代码|函数|修复|调试|重构|实现"),
  data_extraction: z("提取|抽取|字段|json|schema|结构化"),
};

// ---------------------------------------------------------------------------
// Features
// ---------------------------------------------------------------------------

export const ZH_INPUTS = /(文本|原文|上下文|文章|文档|代码|邮件|数据|输入|表格|消息|记录|转录|日志)\s*[:：]|以下(文本|内容|文章|代码|数据)|下面的(文本|内容|文章|代码|数据)|附件|附上|随附|原文如下|如下[:：]|数据集/u;

export const ZH_AUDIENCE = z(
  [
    "受众|读者|面向|针对|适合|目标用户|目标客户|用户群|客户",
    "初学者|新手|小白|入门|中级|高级|专业人士|开发者|程序员|高管|管理层|老板|经理|学生|小学生|中学生|高中生|大学生|研究生|孩子|儿童|家长|投资人|同事|外行|非技术",
  ].join("|"),
);

export const ZH_EXAMPLES = z("示例|例子|举例|比如|例如|范例|範例|样例");

export const ZH_CONSTRAINTS = z(
  [
    "限制|约束|不要|不得|禁止|避免|不能|别|勿|切勿|不需要|无需|不要编造|不要捏造",
    "必须|务必|一定要|需要|应当|应该|最多|至多|不超过|以内|至少|仅限|只用|只能",
    "正式|非正式|口语|书面|中立|直译|意译|语气|篇幅|重点|侧重",
  ].join("|"),
);

export const ZH_TRANSLATION_TARGET = z("译成|译为|翻译成|翻成|翻译为|目标语言|成英文|成中文|成日文|成法文|成德文|成西班牙文|成葡萄牙文|英文版|中文版");

export const ZH_SUMMARY_SHAPE = z("要点|条|列表|段|段落|章节|分点|篇幅|简短|简要|简洁|详细|重点|行|句");

export const ZH_OUTPUT_FORMAT = z("输出格式|回复格式|返回格式|格式|json|表格|步骤|要点|列表|清单|段落|章节|markdown|csv|代码块|大纲");
export const ZH_OUTPUT_LABEL = /(?:^|\n|。\s*)\s*(输出|格式|交付物|输出格式|返回|回复格式)\s*[:：]/u;

export const ZH_SUCCESS = z("成功标准|验收标准|必须包含|需要包含|应包含|要包含|验证|校验|检查是否|确保");

export const ZH_TONE = z("语气|口吻|风格|正式|非正式|轻松|友好|严肃|专业|亲切|幽默|简洁明了|直接|有同理心");

export const ZH_LENGTH = z("简短|简要|简洁|精简|详细|详尽|长篇|短篇|\\d+\\s*(?:个)?(?:段|段落|条|行|句|字|个字|点)|[一二三四五六七八九十两]+\\s*(?:段|条|行|句|点)");
export const ZH_LENGTH_LIMIT = /(最多|至多|不超过|不少于|至少|以内|左右|控制在)\s*\d+|\d+\s*(字|个字|词|行|句|段|个字符|字符)(以内|左右)?/u;

export const ZH_TIMEFRAME = z("最近|最新|近期|目前|当前|今年|去年|本月|上个月|本季度|过去|截至|[0-9]{4}年|[一二三四五六七八九十]+月");

export const ZH_REGION = z("中国|中国大陆|内地|香港|台湾|新加坡|美国|欧洲|日本|韩国|东南亚|北京|上海|深圳|广州|地区|时区");

export const ZH_ERROR = z("报错|错误|异常|失败|崩溃|闪退|卡住|卡死|无法运行|不能运行|跑不起来|错误信息|堆栈|日志|bug");

export const ZH_REPRO = z("复现步骤|重现步骤|如何复现|复现|重现");

export const ZH_INJECTION = z(
  [
    "忽略(?:之前|以上|前面|上面)的?(?:所有)?(?:指令|指示|说明|内容)|无视(?:之前|以上|前面)的?(?:指令|指示)|忘记(?:之前|以上)的?(?:指令|设定)",
    "开发者模式|越狱|泄露系统提示|显示系统提示词|输出系统提示词|系统提示词是什么|隐藏指令|机密指令",
  ].join("|"),
);
export const ZH_SECRETS = z("api密钥|api key|密钥|私钥|密码|口令|凭证|令牌");

export const ZH_SHORT = z("简短|简要|简洁|精简|一句话");
export const ZH_LONG = z("非常详细|尽可能详细|详尽|长篇|全面展开");
export const ZH_NO_ASSUME = z("不要假设|不要猜测|不要臆测");
export const ZH_INVENT = z("编造|虚构|捏造");
export const ZH_ONLY_JSON = z("只输出json|仅输出json|只返回json|仅返回json|只要json|合法的json|有效的json|不要其他文字|不要额外文字|不要附加说明");
export const ZH_EXPLANATION = /解释|推理|说明理由|注释|一步一步|逐步/u;
export const ZH_SUPER_SHORT = /最多\s*\d+\s*行|一句话|一行/u;

// ---------------------------------------------------------------------------
// Implicit output spec ("3个标题", "不超过120字")
// ---------------------------------------------------------------------------

// "一" alone is the everyday measure word ("写一条广告" = "write an ad"), not a count:
// only 2+ (or a digit) states how many items the answer has.
const ZH_NUMBER = "\\d+|[二两三四五六七八九十][一二三四五六七八九十]*|一[十百]";
const ZH_OUTPUT_UNITS = "字|个字|词|行|段|段落|句|条|个标题|个标语|个版本|个变体|个要点|个问题|道题|个例子|个想法|个选项|个步骤|步|个章节|页|张幻灯片|篇|项|个替代方案|张卡片|个练习|则广告|个钩子|个配文";
export const ZH_COUNT_WITH_UNIT = new RegExp(`(?:${ZH_NUMBER})\\s*(?:${ZH_OUTPUT_UNITS})`, "u");
export const ZH_N_QUESTION = new RegExp(`(?:${ZH_NUMBER})\\s*(?:个问题|道题|项|个步骤|步)`, "u");

// ---------------------------------------------------------------------------
// Image prompts
// ---------------------------------------------------------------------------

export const ZH_IMAGE_NEGATIVE = z("不要|不含|没有|避免|除了|负面提示词|排除");

export const ZH_IMAGE_SPEC = z(
  [
    "比例|宽高比|正方形|竖版|横版|竖屏|横屏|肖像|风景|全景",
    "照片|摄影|写实|照片级|插画|水彩|油画|矢量|素描|草图|等距|电影感|电影级",
    "海报|标志|logo|图标|贴纸|表情包|壁纸",
  ].join("|"),
);

// ---------------------------------------------------------------------------
// Coding specs
// ---------------------------------------------------------------------------

export const ZH_CODE_CONSTRAINT = /(用|使用|基于|采用)\s*(pydantic|zod|sqlalchemy|prisma|postgres(ql)?|mysql|sqlite|redis|tailwind|typescript|jest|vitest|pytest)/iu;
export const ZH_CODE_DELIVERABLE = z("包含测试|附上测试|写测试|单元测试|自动化测试|文档字符串|docstring|readme|类型注解|类型标注");
export const ZH_CODE_SUCCESS = /(返回|响应)\s*(状态码\s*)?[1-5]\d\d|测试(全部)?通过|预期[:：]/u;
export const ZH_DEBUG_EXPECTED = /(预期|期望)(结果|行为)?[:：]|应该(返回|输出|显示)|本应|预期是/u;
/** "错误处理", "处理邮箱重复的错误": an implementation requirement, not a bug report. */
export const ZH_ERROR_HANDLING = /错误处理|异常处理|捕获异常|处理[^。，,；;\n]{0,10}(?:错误|异常)/gu;

// ---------------------------------------------------------------------------
// Linter cue lists (substring lists, as in lib/engine/lint)
// ---------------------------------------------------------------------------

export const ZH_CONTEXT_CUES = ["背景", "上下文", "场景", "受众", "读者", "面向", "用于", "用途", "目的", "输入"];
export const ZH_WORK_MATERIAL = ["文本：", "文本:", "原文", "日志", "堆栈", "报错", "错误：", "文件", "附件", "数据集", "csv", "代码", "文章：", "文档：", "数据：", "表格"];
export const ZH_GENERIC_CONSTRAINTS = ["限制", "约束", "最多", "不超过", "不要", "避免", "禁止", "语气", "篇幅", "重点", "以内"];
export const ZH_SOURCE_LABELS = ["文本：", "文本:", "文章：", "文档：", "文件", "附件", "转录：", "邮件：", "消息：", "原文："];
export const ZH_INLINE_SOURCE = /(以下|如下|下面的?)(文本|内容|文章|段落)?\s*[:：]\s*\S/u;
export const ZH_SUMMARY_LENGTH = ["简短", "简要", "简洁", "详细", "要点", "分点", "段", "行", "句", "字"];
export const ZH_SUMMARY_SCOPE = ["重点", "侧重", "核心观点", "主要观点", "关键", "按章节", "按主题", "最重要", "决策", "结论"];
export const ZH_TARGET_LANGUAGE = ["英文", "英语", "中文", "汉语", "日文", "日语", "韩文", "韩语", "法文", "法语", "德文", "德语", "西班牙文", "西班牙语", "葡萄牙文", "葡萄牙语", "目标语言", "译成", "翻译成"];
export const ZH_REGISTER = ["正式", "非正式", "中立", "自然", "直译", "意译", "口语", "书面", "专业", "友好", "礼貌", "轻松"];
export const ZH_STUDY_LEVEL = ["初学者", "零基础", "小白", "入门", "小学", "初中", "高中", "大学", "本科", "研究生", "硕士", "博士", "基础", "中级", "高级", "高考", "考研"];
export const ZH_MARKETING_AUDIENCE = ["受众", "目标用户", "目标客户", "用户画像", "客户", "买家", "面向", "针对", "创始人", "店主", "专业人士"];
export const ZH_MARKETING_CTA = ["行动号召", "号召性用语", "注册", "订阅", "购买", "下单", "预约", "下载", "了解更多", "点击", "立即"];
export const ZH_EXTRACTION_WORDS = ["提取", "抽取", "解析", "字段：", "字段:", "键：", "fields:"];
export const ZH_DEBUG_WORDS = ["bug", "报错", "错误", "崩溃", "闪退", "无法运行", "跑不起来", "卡住", "堆栈", "traceback"];
export const ZH_INPUT_LABEL = /(发票|csv|数据|记录|日志|转录|消息|邮件|文本|输入)\s*[:：]\s*\S/u;
export const ZH_TYPED_FIELD = /(?:string|number|integer|int|float|decimal|boolean|bool|date|datetime|array|object|字符串|数字|整数|日期|布尔|列表|数组)/i;
export const ZH_REPRO_WORD = /步骤|复现|重现/u;

/** Output-format detection (lib/engine/lint/detectOutputFormat.ts). */
export const ZH_FORMAT = {
  strictJson: /(只|仅)(输出|返回|要)\s*json|合法的?\s*json|有效的?\s*json|不要(其他|额外|附加)(文字|说明|内容)/iu,
  json: z("json|schema|字段|结构化"),
  table: z("表格|列表格"),
  steps: z("步骤|第一步|分步|编号"),
  bullets: z("要点|分点|列表|清单|项目符号"),
};

// ---------------------------------------------------------------------------
// Classifier: Chinese alternatives, aligned BY INDEX with the patterns of
// classifyTaskDetailed() (same as PT_TASK) so a signal never counts twice.
// ---------------------------------------------------------------------------

export const ZH_TASK: Record<string, RegExp[]> = {
  coding: [/(代码|函数|组件|接口|脚本|程序)/u, /(实现|编写|写一个|写个)\s*(函数|类|接口|脚本|组件|api|程序)/iu],
  debugging: [/(bug|报错|错误|异常|崩溃|闪退|卡住|无法运行|跑不起来)/iu],
  refactor: [/(重构|整理代码|优化代码|改进代码|代码质量)/u],
  research: [/(调研|研究|查找资料|文献|来源|证据)/u, /(同行评审|引用|元分析|参考文献|学术)/u],
  marketing: [/(营销|推广|活动)/u, /(广告|文案|标题|标语|口号)/u, /(行动号召|转化|落地页)/u, /(seo|品牌|目标用户|目标受众)/iu],
  summarization: [/(总结|摘要|概括|归纳|要点|tl;dr)/iu],
  translation: [/(翻译|译成|译为|翻成)/u],
  data_extraction: [/(提取|抽取|解析)/u, /(json|schema|结构化)/iu, /(字段|键[:：])/u, /(表格列|列[:：])/u],
  planning: [/(计划|规划|路线图|时间表|日程|行程)/u, /(里程碑|清单|分步)/u, /(风险|负责人|依赖|回滚|缓解)/u],
  customer_support: [/(客服|售后|工单|投诉|客诉)/u, /(客户|顾客|用户)/u, /(道歉|抱歉|致歉)/u],
  writing: [/(写|撰写|起草|故事|小说|剧本|文章|博客|帖子|推文)/u],
  study: [/(解释|讲解|教我|学习|复习|理解)/u],
};
