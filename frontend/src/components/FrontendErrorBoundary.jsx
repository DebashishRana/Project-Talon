import React from 'react'

class FrontendErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error('Talon frontend render error:', error)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="frontend-error-state" role="alert">
        <div>
          <p>Application startup error</p>
          <h1>Talon could not render this page.</h1>
          <pre>{this.state.error.message || 'Unknown React error'}</pre>
          <button type="button" onClick={() => window.location.reload()}>Reload application</button>
        </div>
      </main>
    )
  }
}

export default FrontendErrorBoundary
