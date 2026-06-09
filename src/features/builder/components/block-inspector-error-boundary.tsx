"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import type { BlockNode } from "@/types/builder";
import { Button } from "@/components/ui/button";

type Props = {
  block: BlockNode;
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class BlockInspectorErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[block-inspector] render failed for ${this.props.block.type} (${this.props.block.id}):`,
      error,
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.block.id !== this.props.block.id && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (error) {
      const message = error.message?.trim() || "Unknown render error";
      return (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-3">
          <p className="text-sm font-medium text-destructive">Block settings could not load</p>
          <p className="text-xs text-muted-foreground">
            Block <span className="font-mono">{this.props.block.type}</span> (
            <span className="font-mono">{this.props.block.id}</span>)
          </p>
          <p className="text-xs text-muted-foreground break-words">{message}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => this.setState({ error: null })}>
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
