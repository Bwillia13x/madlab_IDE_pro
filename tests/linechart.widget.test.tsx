import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LineChart } from '@/components/widgets/LineChart'

describe('LineChart widget', () => {
  it('renders without crashing', () => {
    const { getAllByTestId } = render(
      <div style={{ width: 600, height: 300 }}>
        {/* minimal widget prop contract */}
        <LineChart widget={{ id: 'w1', type: 'line-chart', title: 'Line', layout: { i: 'w1', x: 0, y: 0, w: 6, h: 4 } }} symbol="ACME" />
      </div>
    )
    // reaches this point without throwing; some environments render twice
    const els = getAllByTestId('line-range')
    expect(els.length).toBeGreaterThanOrEqual(1)
  })
})


