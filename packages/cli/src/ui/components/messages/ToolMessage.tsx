/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { IndividualToolCallDisplay } from '../../types.js';
import { StickyHeader } from '../StickyHeader.js';
import { ToolResultDisplay } from './ToolResultDisplay.js';
import {
  ToolStatusIndicator,
  ToolInfo,
  TrailingIndicator,
  type TextEmphasis,
  STATUS_INDICATOR_WIDTH,
} from './ToolShared.js';
import {
  SHELL_COMMAND_NAME,
  SHELL_FOCUS_HINT_DELAY_MS,
} from '../../constants.js';
import { theme } from '../../semantic-colors.js';
import type { Config } from '@google/gemini-cli-core';
import { useInactivityTimer } from '../../hooks/useInactivityTimer.js';
import { ToolCallStatus } from '../../types.js';
import { ShellInputPrompt } from '../ShellInputPrompt.js';
import { copyToClipboard } from '../../utils/commandUtils.js';

export type { TextEmphasis };

export interface ToolMessageProps extends IndividualToolCallDisplay {
  availableTerminalHeight?: number;
  terminalWidth: number;
  emphasis?: TextEmphasis;
  renderOutputAsMarkdown?: boolean;
  isFirst: boolean;
  borderColor: string;
  borderDimColor: boolean;
  activeShellPtyId?: number | null;
  embeddedShellFocused?: boolean;
  ptyId?: number;
  config?: Config;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({
  name,
  description,
  resultDisplay,
  status,
  availableTerminalHeight,
  terminalWidth,
  emphasis = 'medium',
  renderOutputAsMarkdown = true,
  isFirst,
  borderColor,
  borderDimColor,
  activeShellPtyId,
  embeddedShellFocused,
  ptyId,
  config,
  args,
}) => {
  const isShellCommand = name === SHELL_COMMAND_NAME || name === 'Shell';
  const isThisShellFocused =
    isShellCommand &&
    status === ToolCallStatus.Executing &&
    ptyId === activeShellPtyId &&
    embeddedShellFocused;

  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [userHasFocused, setUserHasFocused] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState<string | null>(null);

  const showFocusHint = useInactivityTimer(
    !!lastUpdateTime,
    lastUpdateTime ? lastUpdateTime.getTime() : 0,
    SHELL_FOCUS_HINT_DELAY_MS,
  );

  useEffect(() => {
    if (resultDisplay) {
      setLastUpdateTime(new Date());
    }
  }, [resultDisplay]);

  useEffect(() => {
    if (isThisShellFocused) {
      setUserHasFocused(true);
    }
  }, [isThisShellFocused]);

  // Auto-hide copied message after 2 seconds
  useEffect(() => {
    if (copiedMessage) {
      const timer = setTimeout(() => setCopiedMessage(null), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [copiedMessage]);

  // Handle keyboard shortcut for copying shell command
  useInput((input, key) => {
    // Only handle for shell commands and when not focused on shell input
    if (!isShellCommand || isThisShellFocused || emphasis !== 'high') {
      return;
    }

    // ctrl+y to copy command
    if (key.ctrl && input === 'y' && args?.['command']) {
      const command = args['command'] as string;
      copyToClipboard(command)
        .then(() => {
          setCopiedMessage('Copied!');
        })
        .catch(() => {
          setCopiedMessage('Copy failed');
        });
    }
  });

  const isThisShellFocusable =
    isShellCommand &&
    status === ToolCallStatus.Executing &&
    config?.getEnableInteractiveShell();

  const shouldShowFocusHint =
    isThisShellFocusable && (showFocusHint || userHasFocused);

  const shouldShowCopyHint =
    isShellCommand && emphasis === 'high' && args?.['command'];

  return (
    <Box flexDirection="column" width={terminalWidth}>
      <StickyHeader
        width={terminalWidth}
        isFirst={isFirst}
        borderColor={borderColor}
        borderDimColor={borderDimColor}
      >
        <ToolStatusIndicator status={status} name={name} />
        <ToolInfo
          name={name}
          status={status}
          description={description}
          emphasis={emphasis}
        />
        {shouldShowFocusHint && (
          <Box marginLeft={1} flexShrink={0}>
            <Text color={theme.text.accent}>
              {isThisShellFocused ? '(Focused)' : '(ctrl+f to focus)'}
            </Text>
          </Box>
        )}
        {shouldShowCopyHint && !shouldShowFocusHint ? (
          <Box marginLeft={1} flexShrink={0}>
            <Text color={theme.text.accent}>
              {copiedMessage ?? '(ctrl+y to copy)'}
            </Text>
          </Box>
        ) : null}
        {emphasis === 'high' && <TrailingIndicator />}
      </StickyHeader>
      <Box
        width={terminalWidth}
        borderStyle="round"
        borderColor={borderColor}
        borderDimColor={borderDimColor}
        borderTop={false}
        borderBottom={false}
        borderLeft={true}
        borderRight={true}
        paddingX={1}
        flexDirection="column"
      >
        <ToolResultDisplay
          resultDisplay={resultDisplay}
          availableTerminalHeight={availableTerminalHeight}
          terminalWidth={terminalWidth}
          renderOutputAsMarkdown={renderOutputAsMarkdown}
        />
        {isThisShellFocused && config && (
          <Box paddingLeft={STATUS_INDICATOR_WIDTH} marginTop={1}>
            <ShellInputPrompt
              activeShellPtyId={activeShellPtyId ?? null}
              focus={embeddedShellFocused}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};
