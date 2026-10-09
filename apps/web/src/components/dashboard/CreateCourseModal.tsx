import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { SEMESTERS, type Semester } from "../../types/course";

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCourseFormData) => Promise<void>;
  initialData?: CreateCourseFormData | null;
  loading?: boolean;
}

export interface CreateCourseFormData {
  code: string;
  name: string;
  semester: string;
  credits: number;
  type: "required" | "elective" | "general";
  instructor: string;
}

const CREDIT_OPTIONS = [
  { value: 1, label: "1 學分" },
  { value: 2, label: "2 學分" },
  { value: 3, label: "3 學分" },
  { value: 4, label: "4 學分" },
];

const TYPE_OPTIONS = [
  { value: "required", label: "必修" },
  { value: "elective", label: "選修" },
  { value: "general", label: "通識" },
] as const;

export function CreateCourseModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}: CreateCourseModalProps) {
  const [formData, setFormData] = useState<CreateCourseFormData>({
    code: "",
    name: "",
    semester: SEMESTERS[0]?.key ?? "103-1",
    credits: 3,
    type: "required",
    instructor: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof CreateCourseFormData, string | undefined>>
  >({});
  const [touched, setTouched] = useState<Partial<Record<keyof CreateCourseFormData, boolean>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        code: "",
        name: "",
        semester: SEMESTERS[0]?.key ?? "103-1",
        credits: 3,
        type: "required",
        instructor: "",
      });
    }
    setErrors({});
    setTouched({});
    setSubmitError(null);
  }, [initialData, isOpen]);

  const validateField = (
    name: keyof CreateCourseFormData,
    value: string | number,
  ): string | undefined => {
    switch (name) {
      case "code":
        if (!value || (value as string).trim().length === 0) return "課程代號為必填";
        const codeStr = (value as string).trim();
        // Allow numeric codes (e.g., 2692) or alphanumeric codes (e.g., CS101, MA101, PHY101)
        if (!/^(\d{4,6}|[A-Z]{2,4}\d{3,4})$/i.test(codeStr))
          return "格式範例: 2692, CS101, MA101, PHY101";
        break;
      case "name":
        if (!value || (value as string).trim().length === 0) return "課程完整名稱為必填";
        if ((value as string).trim().length < 2) return "名稱至少 2 字元";
        break;
      case "credits":
        if (!value || (value as number) < 1) return "學分數至少為 1";
        break;
    }
    return undefined;
  };

  const handleChange = (name: keyof CreateCourseFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (name: keyof CreateCourseFormData) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, formData[name]);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("[CreateCourseModal] handleSubmit called", { formData });
    e.preventDefault();

    const newErrors = {} as Partial<Record<keyof CreateCourseFormData, string | undefined>>;
    for (const [key, value] of Object.entries(formData)) {
      const error = validateField(key as keyof CreateCourseFormData, value);
      if (error !== undefined) {
        newErrors[key as keyof CreateCourseFormData] = error;
      }
    }

    console.log("[CreateCourseModal] validation result", {
      newErrors,
      hasErrors: Object.keys(newErrors).length > 0,
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setTouched({
        code: true,
        name: true,
        semester: true,
        credits: true,
        type: true,
        instructor: true,
      });
      console.log("[CreateCourseModal] validation failed, aborting submit");
      return;
    }

    setSubmitError(null);

    try {
      console.log("[CreateCourseModal] calling onSubmit with", formData);
      await onSubmit(formData);
      console.log("[CreateCourseModal] onSubmit succeeded, closing modal");
      onClose();
    } catch (error) {
      console.error("[CreateCourseModal] onSubmit failed:", error);
      const message = error instanceof Error ? error.message : "建立課程失敗，請稍後再試";
      setSubmitError(message);
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#000000]/75 backdrop-blur-md overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-course-modal-title"
    >
      {/* MODAL CONTAINER */}
      <div className="relative w-full max-w-[710px] my-auto bg-surface-container-high rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] shadow-primary/10 overflow-hidden transition-all transform flex flex-col">
        {/* Ambient Glow Decorator behind modal card */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-secondary-container/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* 1. MODAL HEADER */}
        <div className="relative flex items-start justify-between p-space-lg bg-surface-container-highest/60">
          <div className="flex items-start gap-space-md">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_16px_rgba(192,193,255,0.25)] shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[24px]">library_add</span>
            </div>
            <div>
              <div className="flex items-center gap-space-sm">
                <h2
                  id="create-course-modal-title"
                  className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight"
                >
                  新增學習課程
                </h2>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                建立全新課程空間，並上傳教材啟動 AI 知識萃取管線
              </p>
            </div>
          </div>

          {/* Close & Esc action */}
          <div className="flex items-center gap-space-xs shrink-0">
            <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-label-code-sm text-label-code-sm">
              ESC
            </span>
            <button
              aria-label="關閉視窗"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
              type="button"
              onClick={onClose}
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* MODAL SCROLLABLE BODY */}
        <form
          onSubmit={handleSubmit}
          className="p-space-lg space-y-6 overflow-y-auto max-h-[calc(85vh-130px)]"
        >
          {/* 2. FORM FIELDS: BASIC INFORMATION */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-primary tracking-wider uppercase">
                <span className="material-symbols-outlined text-[14px]">tune</span>
                <span>01. 基本課程規格</span>
              </div>
              <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                *必填項目
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {/* Course Name */}
              <div className="md:col-span-2 space-y-1.5">
                <label
                  className="block font-label-code-sm text-label-code-sm text-on-surface"
                  htmlFor="courseNameInput"
                >
                  課程名稱 <span className="text-error">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant material-symbols-outlined text-[18px]">
                    school
                  </span>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-space-md py-2.5 rounded-lg font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary shadow-inner placeholder:text-on-surface-variant/50 transition-all"
                    id="courseNameInput"
                    placeholder="例如：CS101 計算機概論與系統架構"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    onBlur={() => handleBlur("name")}
                    type="text"
                    required
                    aria-required="true"
                  />
                </div>
                {errors.name && touched.name && (
                  <p className="font-label-code-sm text-error" role="alert">
                    {errors.name}
                  </p>
                )}
              </div>

              {/* Course Code */}
              <div className="space-y-1.5">
                <label
                  className="block font-label-code-sm text-label-code-sm text-on-surface"
                  htmlFor="courseCodeInput"
                >
                  課程代碼 <span className="text-error">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant material-symbols-outlined text-[18px]">
                    tag
                  </span>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-space-md py-2.5 rounded-lg font-label-code-md text-label-code-md focus:outline-none focus:ring-1 focus:ring-primary shadow-inner placeholder:text-on-surface-variant/50 transition-all"
                    id="courseCodeInput"
                    placeholder="例如：2692"
                    value={formData.code.toUpperCase()}
                    onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                    onBlur={() => handleBlur("code")}
                    type="text"
                    required
                    aria-required="true"
                  />
                </div>
                {errors.code && touched.code && (
                  <p className="font-label-code-sm text-error" role="alert">
                    {errors.code}
                  </p>
                )}
              </div>

              {/* Semester Selector */}
              <div className="space-y-1.5">
                <label
                  className="block font-label-code-sm text-label-code-sm text-on-surface"
                  htmlFor="semesterSelect"
                >
                  學期歸屬 <span className="text-error">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant material-symbols-outlined text-[18px]">
                    calendar_month
                  </span>
                  <select
                    className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-10 py-2.5 rounded-lg font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary shadow-inner appearance-none cursor-pointer"
                    id="semesterSelect"
                    name="semester"
                    value={formData.semester}
                    onChange={(e) => handleChange("semester", e.target.value)}
                    onBlur={() => handleBlur("semester")}
                  >
                    {SEMESTERS.map((s: Semester) => (
                      <option key={s.key} value={s.key} className="bg-surface-container-low">
                        {s.label} ({s.year - 1911}-{s.term === 1 ? "1" : "2"})
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-3 pointer-events-none text-on-surface-variant material-symbols-outlined text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Instructor */}
              <div className="md:col-span-2 space-y-1.5">
                <label
                  className="block font-label-code-sm text-label-code-sm text-on-surface"
                  htmlFor="instructorInput"
                >
                  教師 / 授課教授
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-on-surface-variant material-symbols-outlined text-[18px]">
                    badge
                  </span>
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface pl-10 pr-space-md py-2.5 rounded-lg font-body-md text-body-md focus:outline-none focus:ring-1 focus:ring-primary shadow-inner placeholder:text-on-surface-variant/50 transition-all"
                    id="instructorInput"
                    placeholder="例如：李教授 (Prof. Lee)"
                    value={formData.instructor}
                    onChange={(e) => handleChange("instructor", e.target.value)}
                    type="text"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. DRAG & DROP MATERIAL FILE UPLOADER */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-secondary tracking-wider uppercase">
                <span className="material-symbols-outlined text-[14px]">cloud_upload</span>
                <span>02. 教材原始檔案上傳</span>
              </div>
              <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                支援 MP3, WAV, M4A, PDF, PPTX (單檔上限 250MB)
              </span>
            </div>

            {/* Upload Drop Surface */}
            <div className="relative p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container transition-all flex flex-col items-center justify-center text-center cursor-pointer group shadow-inner">
              <div className="w-12 h-12 rounded-xl bg-surface-container-high group-hover:bg-primary/20 flex items-center justify-center text-secondary group-hover:text-primary transition-all mb-2 shadow-sm">
                <span className="material-symbols-outlined text-[26px]">upload_file</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface font-medium">
                將音檔或簡報拖曳至此處，或{" "}
                <span className="text-primary hover:underline font-semibold">瀏覽本地檔案</span>
              </p>
              <p className="font-label-code-sm text-label-code-sm text-on-surface-variant mt-1">
                系統將即時排程 Whisper-v3 語音轉錄與 OCR 簡報版面分析
              </p>
            </div>

            {/* Staged Files Ready List */}
            <div className="space-y-2">
              {/* File 1: Audio */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low shadow-sm">
                <div className="flex items-center gap-space-sm min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center text-secondary shrink-0">
                    <span className="material-symbols-outlined text-[20px]">mic</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-code-md text-label-code-md text-on-surface font-medium truncate">
                        lecture_04_mips_pipeline.mp3
                      </span>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-primary/10 text-primary font-label-code-sm text-label-code-sm">
                        課堂音檔
                      </span>
                    </div>
                    <div className="flex items-center gap-space-sm text-on-surface-variant font-label-code-sm text-label-code-sm mt-0.5">
                      <span>54.2 MB</span>
                      <span>•</span>
                      <span className="text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        校驗完畢・已就緒
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  aria-label="移除檔案"
                  className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors shrink-0"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>

              {/* File 2: PDF Slides */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low shadow-sm">
                <div className="flex items-center gap-space-sm min-w-0 pr-2">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center text-tertiary shrink-0">
                    <span className="material-symbols-outlined text-[20px]">slideshow</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-label-code-md text-label-code-md text-on-surface font-medium truncate">
                        CS101_Week4_Hazard_Detection.pdf
                      </span>
                      <span className="shrink-0 px-2 py-0.5 rounded bg-tertiary/10 text-tertiary font-label-code-sm text-label-code-sm">
                        投影片講義
                      </span>
                    </div>
                    <div className="flex items-center gap-space-sm text-on-surface-variant font-label-code-sm text-label-code-sm mt-0.5">
                      <span>18.6 MB</span>
                      <span>•</span>
                      <span className="text-tertiary flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        解析 42 頁・已就緒
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  aria-label="移除檔案"
                  className="w-7 h-7 rounded flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors shrink-0"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>

            {/* Add More Button */}
            <button
              className="w-full py-2 px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-label-code-sm text-label-code-sm flex items-center justify-center gap-space-xs transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              <span>+ 新增更多教材檔案 (音檔/講義)</span>
            </button>
          </section>

          {/* 4. AI PIPELINE CONFIGURATION */}
          <section className="space-y-4 pt-2">
            <div className="flex items-center gap-space-xs font-label-caps text-label-caps text-tertiary tracking-wider uppercase">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              <span>03. AI 管線啟動配置</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Toggle 1: Auto-run orchestrator */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors shadow-sm">
                <input
                  defaultChecked
                  className="mt-1 w-4 h-4 rounded-sm bg-surface-container-lowest text-primary focus:ring-primary focus:ring-offset-0 focus:outline-none"
                  type="checkbox"
                />
                <div>
                  <span className="font-body-md text-body-md text-on-surface font-medium block">
                    自動啟動 AI 管線處理
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    建立後立即自動派工至 Celery 進行語音分段與雙向對齊
                  </span>
                </div>
              </label>

              {/* Toggle 2: Auto-generate quiz */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors shadow-sm">
                <input
                  defaultChecked
                  className="mt-1 w-4 h-4 rounded-sm bg-surface-container-lowest text-primary focus:ring-primary focus:ring-offset-0 focus:outline-none"
                  type="checkbox"
                />
                <div>
                  <span className="font-body-md text-body-md text-on-surface font-medium block">
                    生成預設 8 題隨堂測驗
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    萃取完即刻生成 Bloom 階層化概念單選題與解釋
                  </span>
                </div>
              </label>
            </div>

            {/* Synthesis Strategy Selector */}
            <div className="space-y-2">
              <span className="block font-label-code-sm text-label-code-sm text-on-surface">
                融合度預設策略：
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container cursor-pointer transition-colors shadow-inner">
                  <input
                    defaultChecked
                    className="w-4 h-4 text-primary bg-surface-container-low focus:ring-primary focus:ring-offset-0"
                    name="alignmentStrategy"
                    type="radio"
                    value="strict"
                  />
                  <div>
                    <span className="font-body-sm text-body-sm text-on-surface font-bold block">
                      嚴格課堂對齊
                    </span>
                    <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                      依簡報時間戳精準錨定教授口述
                    </span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container cursor-pointer transition-colors shadow-inner">
                  <input
                    className="w-4 h-4 text-primary bg-surface-container-low focus:ring-primary focus:ring-offset-0"
                    name="alignmentStrategy"
                    type="radio"
                    value="summary"
                  />
                  <div>
                    <span className="font-body-sm text-body-sm text-on-surface font-bold block">
                      高階概念摘要
                    </span>
                    <span className="font-label-code-sm text-label-code-sm text-on-surface-variant">
                      整合章節全觀，適合期末快速複習
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* 5. MODAL FOOTER ACTION BAR */}
          <div className="p-space-lg bg-surface-container-highest/80 flex flex-col sm:flex-row items-center justify-between gap-space-md">
            {/* Submit Error Display */}
            {submitError && (
              <div
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 border border-error/30 text-error font-body-sm text-body-sm animate-in slide-in-from-top-2 duration-200"
                role="alert"
              >
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{submitError}</span>
              </div>
            )}

            {/* Status Tip */}
            <div className="flex items-center gap-2 text-on-surface-variant font-label-code-sm text-label-code-sm">
              <span className="material-symbols-outlined text-secondary text-[16px]">info</span>
              <span className="truncate max-w-[320px]">
                建立後配發 sessionId 並導向重點排版工作台
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
              <button
                className="px-space-lg py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors shadow-sm"
                type="button"
                onClick={onClose}
                disabled={loading}
              >
                取消
              </button>
              <button
                className="px-space-lg py-2.5 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-body-sm text-body-sm font-semibold flex items-center justify-center gap-space-xs transition-all shadow-[0_0_20px_rgba(128,131,255,0.4)] hover:shadow-[0_0_24px_rgba(128,131,255,0.6)]"
                type="submit"
                disabled={loading}
              >
                <span>建立課程並啟動管線</span>
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
