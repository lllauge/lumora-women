/** Maps a range key to an ISO `from` boundary. Empty string = no lower bound. */
export function rangeBounds(range: string): { from: string; label: string } {
  const now = new Date()
  switch (range) {
    case '7d': {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      return { from: d.toISOString(), label: 'Last 7 days' }
    }
    case '90d': {
      const d = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      return { from: d.toISOString(), label: 'Last 90 days' }
    }
    case 'ytd': {
      const d = new Date(now.getFullYear(), 0, 1)
      return { from: d.toISOString(), label: 'Year to date' }
    }
    case 'all':
      return { from: '', label: 'All time' }
    case '30d':
    default: {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      return { from: d.toISOString(), label: 'Last 30 days' }
    }
  }
}
