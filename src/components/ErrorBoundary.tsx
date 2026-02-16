import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div style={{ padding: '20px', color: '#ff6b6b', backgroundColor: '#2d1f1f', borderRadius: '8px', border: '1px solid #ff6b6b' }}>
                    <h3>Such Empty. Much Error. 🐶</h3>
                    <p>Something went wrong in this component.</p>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', marginTop: '10px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '10px' }}>
                        {this.state.error?.toString()}
                    </pre>
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '10px', marginTop: '10px', opacity: 0.7 }}>
                        {this.state.errorInfo?.componentStack}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
