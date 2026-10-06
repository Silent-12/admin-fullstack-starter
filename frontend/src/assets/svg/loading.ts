// 自定义圆圈线条旋转 SVG（带开口的圆环，持续旋转）
export const fourDotsSpinnerSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
    <style>
      .ring-spinner {
        fill: none;
        stroke: var(--theme-color);
        stroke-width: 2;
        stroke-linecap: round;
        stroke-dasharray: 75 100;
        transform-origin: 20px 20px;
        animation: ring-spin 1s linear infinite;
      }
      @keyframes ring-spin {
        100% { transform: rotate(360deg); }
      }
    </style>
    <circle class="ring-spinner" cx="20" cy="20" r="16"/>
  </svg>
`
