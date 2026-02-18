import { cn, formatCurrency } from './utils'

describe('utils', () => {
    describe('cn', () => {
        it('should merge class names', () => {
            expect(cn('c1', 'c2')).toBe('c1 c2')
        })

        it('should handle conditions', () => {
            expect(cn('c1', false && 'c2', 'c3')).toBe('c1 c3')
        })
    })

    describe('formatCurrency', () => {
        it('should format numbers as USD currency', () => {
            // Note: non-breaking space might be present in output of Intl.NumberFormat
            const result = formatCurrency(1000)
            expect(result).toContain('$')
            expect(result).toContain('1,000.00')
        })
    })
})
