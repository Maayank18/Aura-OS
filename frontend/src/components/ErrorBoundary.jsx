// ErrorBoundary.jsx — Fixed CSS variables, calming design

import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError:false, error:null };
  }
  static getDerivedStateFromError(error) { return { hasError:true, error }; }
  componentDidCatch(error, info) { console.error('[ErrorBoundary]', error, info.componentStack); }
  handleReset = () => this.setState({ hasError:false, error:null });

  render() {
    if (!this.state.hasError) return this.props.children;
    const { label = 'This feature' } = this.props;
    return (
      <div style={{
        display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
        minHeight:320,gap:16,padding:32,textAlign:'center',
      }}>
        <div style={{
          width:56,height:56,borderRadius:'50%',
          background:'rgba(255,107,138,0.12)',border:'1px solid rgba(255,107,138,0.3)',
          display:'flex',alignItems:'center',justifyContent:'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="#ff6b8a" strokeWidth="1.5" strokeLinecap="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div>
          <p style={{fontSize:16,fontWeight:600,color:'var(--text-1)',marginBottom:6}}>
            {label} ran into a problem
          </p>
          <p style={{fontSize:13,color:'var(--text-3)',maxWidth:340,lineHeight:1.6}}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={this.handleReset} style={{fontSize:13}}>
          Try again
        </button>
      </div>
    );
  }
}