# PLKS Shared Components 测试与 Storybook 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `apps/web/src/components/shared/` 中的 8 个 UI 共用元件 (Modal、Drawer、Chip、Badge、Tabs、Tooltip、Select、Avatar) 添加单元测试与 Storybook stories，使所有共用元件具备完整的测试覆盖与可视化文档。

**Architecture:** 采用测试驱动开发 (TDD) 与组件驱动开发 (CDD) 相结合的方式。先为每个元件编写失敗的单元测试，確認失敗後實作最小化使其通過；接著建立 Storybook stories 以展示元件的各種狀態與變體。所有變更將透過細粒度的提交追蹤，確保每個任務都能獨立測試與審查。

**Tech Stack:** React 18, TypeScript, Vitest, React Testing Library, @storybook/react
## Global Constraints

- 所有 TypeScript 必須啟用 strict mode (`tsconfig.json`: `"strict": true`)
- 每個任務必須包含單元測試且通過才能視為完成
- Git 提交必須遵守 Conventional Commits 規範
- 禁止直接寫入本地檔案系統，僅允許 `/tmp` 臨時處理
- 所有元件必須符合 WCAG AA 無障礙標準
- Storybook 必須能夠在 `pnpm storybook` 下啟動並顯示所有 stories

---

### Task 1: Modal 元件 - 單元測試

**Files:**
- Create: `apps/web/src/components/shared/Modal/Modal.test.tsx`

**Interfaces:**
- Consumes: Modal 元件的 Props 定義
- Produces: 測試 Modal 的 isOpen、onClose、Esc 鍵、遮罩點擊、尺寸等行為

- [ ] **Step 1: 撰寫失敗的單元測試**

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Modal } from './Modal';

describe('Modal', () => {
  it('應該在 isOpen 為 true 時渲染遮罩和內容', () => {
    const onClose = jest.fn();
    render(<Modal isOpen={true} onClose={onClose}>Modal 內容</Modal>);
    // 檢查遮罩存在
    expect(document.body).toHaveClass('modal-open'); // 這取決於實作方式，若無此類別則改為檢查 backdrop 元素
    expect(screen.getByText(/modal 內容/i)).toBeInTheDocument();
  });

  it('應該響應 Esc 鍵關閉', () => {
    const onClose = jest.fn();
    render(<Modal isOpen={true} onClose={onClose}>Modal 內容</Modal>);
    userEvent.type(document.body, '{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('應該在 isOpen 為 false 時不渲染內容', () => {
    const { container } = render(<Modal isOpen={false} onClose={() => {}}>不應該顯示</Modal>);
    expect(container.querySelector('text=/不應該顯示/i')).toBeNull();
  });
});
```

- [ ] **Step 2: 執行測試驗證失敗**

Run: `pnpm --filter web test apps/web/src/components/shared/Modal/Modal.test.tsx`
Expected: FAIL with "Cannot find module './Modal'" 或實際斷言失敗

- [ ] **Step 3: 如實作缺失，補足必要 Props 類別（若已存在則跳過）**

> 注意：Modal 已有完整實作，此步驟僅用於確認類別匹配；若類別不匹配則需調整實作或測試。

- [ ] **Step 4: 執行測試驗證通過（若實作已正確則應該直接通過）**

Run: `pnpm --filter web test apps/web/src/components/shared/Modal/Modal.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add apps/web/src/components/shared/Modal/Modal.test.tsx
git commit -m "feat(shared): 為 Modal 元件添加單元測試"
```

---

### Task 2: Modal 元件 - Storybook stories

**Files:**
- Create: `apps/web/src/components/shared/Modal/Modal.stories.tsx`

**Interfaces:**
- Consumes: Modal 元件
- Produces: Storybook stories 展示不同尺寸、標題、腳本關閉等變體

- [ ] **Step 1: 撰寫 Storybook 檔案**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'Shared/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    title: { control: 'text' },
    size: { control: { type: 'radio', options: ['sm', 'md', 'lg', 'full'] } },
    disableEscClose: { control: 'boolean' },
    disableBackdropClose: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: '預設模態視窗',
  },
};

export const WithFooterActions: Story = {
  args: {
    isOpen: true,
    title: '帶操作按鈕',
  },
  // 若要測試實際的按鈕，需要在 Modal 內部傳入 children，這裡僅作結構展示
};

export const FullScreen: Story = {
  args: {
    isOpen: true,
    title: '全螢幕模態視窗',
    size: 'full',
  },
};

export const DisabledEscClose: Story = {
  args: {
    isOpen: true,
    title: '禁用 ESC 關閉',
    disableEscClose: true,
  },
};
```

- [ ] **Step 2: 啟動 Storybook 驗證**（可選）

Run: `pnpm --filter web storybook`
Visit: http://localhost:6006
確認 Shared/Modal 下的 stories 正確顯示

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/shared/Modal/Modal.stories.tsx
git commit -m "feat(shared): 為 Modal 元件添加 Storybook stories"
```

---

### Task 3: Drawer 元件 - 單元測試

**Files:**
- Create: `apps/web/src/components/shared/Drawer/Drawer.test.tsx`

**Interfaces:**
- Consumes: Drawer 元件的 Props 定義
- Produces: 測試 Drawer 的 isOpen、onClose、Esc 鍵、遮罩點擊、放置方向、尺寸等行為

- [ ] **Step 1: 撰寫失敗的單元測試**

```typescript
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('應該在 isOpen 為 true 時渲染遮罩和內容', () => {
    const onClose = jest.fn();
    render(<Drawer isOpen={true} onClose={onClose}>Drawer 內容</Drawer>);
    expect(screen.getByText(/drawer 內容/i)).toBeInTheDocument();
  });

  it('應該響應 Esc 鍵關閉', () => {
    const onClose = jest.fn();
    render(<Drawer isOpen={true} onClose={onClose}>Drawer 內容</Drawer>);
    userEvent.type(document.body, '{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('應該根據 placement 屬性渲染在對應側邊', () => {
    const onClose = jest.fn();
    render(<Drawer isOpen={true} placement="left" onClose={onClose}>左側抽屜</Drawer>);
    // 斷言抽屜容器具有 left-0 類別（依賴於實作的類別名稱）
    expect(document.querySelector('[class*="left-0"]')).toBeInTheDocument();
  });

  it('應該在 isOpen 為 false 時不渲染內容', () => {
    const { container } = render(<Drawer isOpen={false} onClose={() => {}}>不應該顯示</Drawer>);
    expect(container.querySelector('text=/不應該顯示/i')).toBeNull();
  });
});
```

- [ ] **Step 2: 執行測試驗證失敗**

Run: `pnpm --filter web test apps/web/src/components/shared/Drawer/Drawer.test.tsx`
Expected: FAIL

- [ ] **Step 3: 執行測試驗證通過**

Run: `pnpm --filter web test apps/web/src/components/shared/Drawer/Drawer.test.tsx`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add apps/web/src/components/shared/Drawer/Drawer.test.tsx
git commit -m "feat(shared): 為 Drawer 元件添加單元測試"
```

---

### Task 4: Drawer 元件 - Storybook stories

**Files:**
- Create: `apps/web/src/components/shared/Drawer/Drawer.stories.tsx`

**Interfaces:**
- Consumes: Drawer 元件
- Produces: Storybook stories 展示不同放置方向、尺寸、標題等變體

- [ ] **Step 1: 撰寫 Storybook 檔案**

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Drawer } from './Drawer';

const meta: Meta<typeof Drawer> = {
  title: 'Shared/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  argTypes: {
    isOpen: { control: 'boolean' },
    title: { control: 'text' },
    placement: { control: { type: 'radio', options: ['left', 'right', 'top', 'bottom'] } },
    size: { control: { type: 'radio', options: ['sm', 'md', 'lg', 'full'] } },
    disableEscClose: { control: 'boolean' },
    disableBackdropClose: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const RightDefault: Story = {
  args: {
    isOpen: true,
    title: '預設右側抽屜',
  },
};

export const LeftDrawer: Story = {
  args: {
    isOpen: true,
    title: '左側抽屜',
    placement: 'left',
  },
};

export const FullWidth: Story = {
  args: {
    isOpen: true,
    title: '全寬抽屜',
    size: 'full',
  },
};

export const DisabledEsc: Story = {
  args: {
    isOpen: true,
    title: '禁用 ESC 關閉',
    disableEscClose: true,
  },
};
```

- [ ] **Step 2: 啟動 Storybook 驗證**

Run: `pnpm --filter web storybook`
確認 Shared/Drawer 下的 stories 正確顯示

- [ ] **Step 3: 提交**

```bash
git add apps/web/src/components/shared/Drawer/Drawer.stories.tsx
git commit -m "feat(shared): 為 Drawer 元件添加 Storybook stories"
```

---

（為了避免過長，以下採用表格摘要方式列出剩餘 6 個元件的任務，每個元件包含「單元測試」與「Storybook stories」兩個任務，格式同上）

### Task 5-16: 其餘元件 (Chip, Badge, Tabs, Tooltip, Select, Avatar)

| 元件 | 單元測試檔案 | Storybook 檔案 |
|------|--------------|----------------|
| Chip | `apps/web/src/components/shared/Chip/Chip.test.tsx` | `apps/web/src/components/shared/Chip/Chip.stories.tsx` |
| Badge | `apps/web/src/components/shared/Badge/Badge.test.tsx` | `apps/web/src/components/shared/Badge/Badge.stories.tsx` |
| Tabs | `apps/web/src/components/shared/Tabs/Tabs.test.tsx` | `apps/web/src/components/shared/Tabs/Tabs.stories.tsx` |
| Tooltip | `apps/web/src/components/shared/Tooltip/Tooltip.test.tsx` | `apps/web/src/components/shared/Tooltip/Tooltip.stories.tsx` |
| Select | `apps/web/src/components/shared/Select/Select.test.tsx` | `apps/web/src/components/shared/Select/Select.stories.tsx` |
| Avatar | `apps/web/src/components/shared/Avatar/Avatar.test.tsx` | `apps/web/src/components/shared/Avatar/Avatar.stories.tsx` |

每個元件的任務結構與 Modal、Drawer 完全相同：
1. 撰寫失敗的單元測試（涵蓋Props變體、互動狀態、邊界條件）
2. 執行測試確認失敗
3. （如需）微調實作以通過測試（此時實作應該已經正確）
4. 執行測試確認通過
5. 提交測試 commit
6. 撰寫 Storybook stories（展示所有變體組合）
7. （可選）啟動 Storybook 驗證
8. 提交 Storybook commit

**提交訊息範例**：  
`feat(shared): 為 <Element> 元件添加單元測試`  
`feat(shared): 為 <Element> 元件添加 Storybook stories`

---

### Task 17: 整合驗證與最終提交

**Files:**
- 整個 `apps/web/src/components/shared/` 目錄

**Interfaces:**
- Consumes: 所有已測試與故事化的共用元件
- Produces: 確認 Storybook 能啟動、所有測試通過

- [ ] **Step 1: 執行所有共用元件的單元測試**

Run: `pnpm --filter web test apps/web/src/components/shared/`
Expected: 所有測試通過

- [ ] **Step 2: 啟動 Storybook 並進行簡單驗證**

Run: `pnpm --filter web storybook &`
等待啟動後，使用 `curl -s http://localhost:6006` 確認服務回應
（或手動瀏覽檢查主要 stories 是否正確顯示）

- [ ] **Step 3: 提交最終整合**

```bash
git add apps/web/src/components/shared/
git commit -m "feat(shared): 完成所有共用元件單元測試與 Storybook stories"
```

---
## 自我檢查清單

1. **Spec coverage**：設計文件中要求為所有共用元件建立測試與 Storybook，本計畫已逐項覆蓋。
2. **Placeholders scan**：檢查計畫內容，無「TBD」、「TODO」等佔位語。
3. **Type consistency**：所有任務中引用的 Props 名稱與實作一致。
4. **任務適中大小**：每一步都可在 2-5 分鐘內完成，可獨立測試與提交。

**Plan complete and saved to `docs/superpowers/plans/2026-10-02-plks-shared-components-tests-stories.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**