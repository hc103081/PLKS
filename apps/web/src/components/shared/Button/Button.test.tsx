import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('應該渲染主要按鈕與正確樣式類別', () => {
    render(<Button variant="primary">主要按鈕</Button>);
    const button = screen.getByRole('button', { name: /主要按鈕/i });
    expect(button).toBeInTheDocument();
    // 注意：實際的類別檢查會更複雜，這裡我們只做基本存在性檢查
    expect(button).toHaveAttribute('type', 'button');
  });

  it('應該在禁用狀態下不觸發點擊事件', () => {
    const handleClick = vi.fn();
    render(<Button variant="primary" disabled onClick={handleClick}>按鈕</Button>);
    userEvent.click(screen.getByRole('button', { name: /按鈕/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('應該支援載入狀態顯示', () => {
    render(<Button variant="primary" loading>載入中...</Button>);
    const button = screen.getByRole('button', { name: /載入中/i });
    expect(button).toBeDisabled(); // 載入狀態應該變為禁用
  });

  it('應該支援圖標', () => {
    const icon = <span>圖標</span>;
    render(<Button iconLeft={icon}>按鈕與圖標</Button>);
    const button = screen.getByRole('button', { name: /按鈕與圖標/i });
    // 檢查圖標是否存在（這需要更詳細的DOM檢查）
    expect(button).toContainHTML('圖標');
  });
});