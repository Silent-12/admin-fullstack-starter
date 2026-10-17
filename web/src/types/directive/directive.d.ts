import type { AuthDirective, HighlightDirective } from '@/directives'

declare module 'vue' {
  export interface GlobalDirectives {
    vAuth: AuthDirective
    vHighlight: HighlightDirective
  }
}
