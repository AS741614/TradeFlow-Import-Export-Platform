'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

export default function DesignSystemShowcase() {
  const [inputValue, setInputValue] = useState('');
  const [buttonLoading, setButtonLoading] = useState(false);

  return (
    <main className="app-content">
      <header className="page-header">
        <h1 id="showcase-title">Design System Showcase</h1>
        <p>Internal showcase page demonstrating foundation primitives and design system states.</p>
      </header>

      <div className="stack-7">
        {/* Buttons Section */}
        <Card
          id="showcase-buttons-card"
          header={
            <div className="cluster-2">
              <h2 id="section-buttons-title" className="text-lg font-bold">Buttons</h2>
              <Button
                id="btn-toggle-loading"
                variant="ghost"
                size="sm"
                onClick={() => setButtonLoading(!buttonLoading)}
              >
                Toggle Loading States
              </Button>
            </div>
          }
        >
          <div className="stack-4">
            <h3 className="text-sm font-semibold text-secondary">Variants & Sizes</h3>
            
            <div className="stack-3">
              {/* Primary */}
              <div className="cluster-3">
                <Button id="btn-primary-sm" variant="primary" size="sm" isLoading={buttonLoading}>Primary SM</Button>
                <Button id="btn-primary-md" variant="primary" size="md" isLoading={buttonLoading}>Primary MD</Button>
                <Button id="btn-primary-lg" variant="primary" size="lg" isLoading={buttonLoading}>Primary LG</Button>
              </div>

              {/* Secondary */}
              <div className="cluster-3">
                <Button id="btn-secondary-sm" variant="secondary" size="sm" isLoading={buttonLoading}>Secondary SM</Button>
                <Button id="btn-secondary-md" variant="secondary" size="md" isLoading={buttonLoading}>Secondary MD</Button>
                <Button id="btn-secondary-lg" variant="secondary" size="lg" isLoading={buttonLoading}>Secondary LG</Button>
              </div>

              {/* Ghost */}
              <div className="cluster-3">
                <Button id="btn-ghost-sm" variant="ghost" size="sm" isLoading={buttonLoading}>Ghost SM</Button>
                <Button id="btn-ghost-md" variant="ghost" size="md" isLoading={buttonLoading}>Ghost MD</Button>
                <Button id="btn-ghost-lg" variant="ghost" size="lg" isLoading={buttonLoading}>Ghost LG</Button>
              </div>

              {/* Danger */}
              <div className="cluster-3">
                <Button id="btn-danger-sm" variant="danger" size="sm" isLoading={buttonLoading}>Danger SM</Button>
                <Button id="btn-danger-md" variant="danger" size="md" isLoading={buttonLoading}>Danger MD</Button>
                <Button id="btn-danger-lg" variant="danger" size="lg" isLoading={buttonLoading}>Danger LG</Button>
              </div>

              {/* Disabled */}
              <div className="cluster-3">
                <Button id="btn-disabled-primary" variant="primary" disabled>Disabled Primary</Button>
                <Button id="btn-disabled-secondary" variant="secondary" disabled>Disabled Secondary</Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Inputs Section */}
        <Card
          id="showcase-inputs-card"
          header={<h2 id="section-inputs-title" className="text-lg font-bold">Inputs</h2>}
        >
          <div className="grid-2">
            <Input
              id="input-default"
              label="Default Input"
              placeholder="Type here..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />

            <Input
              id="input-with-hint"
              label="Input with Hint"
              placeholder="Username"
              hint="Must be alphanumeric and 3-15 chars."
            />

            <Input
              id="input-with-error"
              label="Input with Error"
              placeholder="Email address"
              defaultValue="invalid-email"
              error="Please enter a valid email address."
            />

            <Input
              id="input-disabled"
              label="Disabled Input"
              placeholder="Locked"
              disabled
            />
          </div>
        </Card>

        {/* Cards Section */}
        <Card
          id="showcase-cards-card"
          header={<h2 id="section-cards-title" className="text-lg font-bold">Cards</h2>}
        >
          <div className="grid-2">
            {/* Standard Card */}
            <Card
              id="sub-card-standard"
              header={<h3 className="font-semibold">Standard Card Header</h3>}
              footer={<span className="text-xs text-tertiary">Standard Card Footer</span>}
            >
              <p className="text-sm">This is the body content of a standard UI Card. It supports customizable header, body, and footer slots.</p>
            </Card>

            {/* Glassmorphic Interactive Card */}
            <Card
              id="sub-card-glass"
              variant="glass"
              isInteractive
              header={<h3 className="font-semibold text-primary">Interactive Glass Card</h3>}
              footer={<span className="text-xs text-secondary">Hover me to see scale transition</span>}
            >
              <p className="text-sm text-secondary">This card utilizes the glassmorphic style option combined with isInteractive behavior to enable visual hover micro-animations.</p>
            </Card>
          </div>
        </Card>

        {/* Badges and Spinners Section */}
        <div className="grid-2">
          {/* Badges */}
          <Card
            id="showcase-badges-card"
            header={<h2 id="section-badges-title" className="text-lg font-bold">Badges</h2>}
          >
            <div className="stack-4">
              <p className="text-sm text-secondary">Semantic status pills mapped to global design tokens.</p>
              <div className="cluster-2">
                <Badge id="badge-neutral" variant="neutral">Neutral</Badge>
                <Badge id="badge-info" variant="info">Info</Badge>
                <Badge id="badge-success" variant="success">Success</Badge>
                <Badge id="badge-warning" variant="warning">Warning</Badge>
                <Badge id="badge-danger" variant="danger">Danger</Badge>
              </div>
            </div>
          </Card>

          {/* Spinners */}
          <Card
            id="showcase-spinners-card"
            header={<h2 id="section-spinners-title" className="text-lg font-bold">Spinners</h2>}
          >
            <div className="stack-4">
              <p className="text-sm text-secondary">Spinning visual indicator in different pre-configured sizes.</p>
              <div className="cluster-4">
                <div className="cluster-2">
                  <Spinner id="spinner-small" size="sm" />
                  <span className="text-xs text-tertiary">Small</span>
                </div>
                <div className="cluster-2">
                  <Spinner id="spinner-medium" size="md" />
                  <span className="text-xs text-tertiary">Medium</span>
                </div>
                <div className="cluster-2">
                  <Spinner id="spinner-large" size="lg" />
                  <span className="text-xs text-tertiary">Large</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
