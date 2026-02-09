/**
 * Pi PKM Mode Extension
 *
 * Toggle a Personal Knowledge Management mode via /pkm.
 *
 * Usage:
 *   pi -e ./extensions/pi-pkm-mode.ts
 *   /pkm
 *   /pkm on
 *   /pkm off
 *   /pkm status
 *   /pkm Capture this idea in my notes
 *
 * Optional startup flags (after extension is loaded):
 *   --pkm
 *   --pkm-prompt-path ~/code/aiderx/aider/extensions/handlers/pkm_handler.py
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const DEFAULT_PI_PKM_PROMPT = `You are an expert personal knowledge manager.
Your goal is to help me organize my thoughts, ideas, and knowledge into a structured set of files.
You will be creating and editing markdown files.
When I share ideas with you, you should help me clarify them and then save them to the appropriate files.
You can ask me questions to better understand where to save the information or how to structure it.
Focus on creating a well-organized and easy-to-navigate knowledge base.
Do not write code unless I explicitly ask you to.`;

const PKM_PROMPT_ASSIGNMENT_CANDIDATES = ["pkm_system", "main_system", "system_prompt", "system", "prompt"] as const;

const TRIPLE_QUOTE_BLOCK_RE = /(?:[rRuUbBfF]{0,2})?("""[\s\S]*?"""|'''[\s\S]*?''')/;

interface ResolvedPiPkmPrompt {
	prompt: string;
	source: string;
}

interface PkmModeState {
	enabled: boolean;
	prompt: string;
	promptSource: string;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripTripleQuotes(value: string): string {
	if (value.startsWith('"""') && value.endsWith('"""')) {
		return value.slice(3, -3);
	}
	if (value.startsWith("'''") && value.endsWith("'''")) {
		return value.slice(3, -3);
	}
	return value;
}

function dedent(value: string): string {
	const lines = value.replace(/\r\n/g, "\n").split("\n");

	while (lines.length > 0 && lines[0]?.trim() === "") {
		lines.shift();
	}
	while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
		lines.pop();
	}

	let minIndent = Number.POSITIVE_INFINITY;
	for (const line of lines) {
		if (line.trim() === "") continue;
		const match = line.match(/^\s*/);
		const indent = match?.[0].length ?? 0;
		minIndent = Math.min(minIndent, indent);
	}

	if (!Number.isFinite(minIndent)) {
		return "";
	}

	return lines
		.map((line) => line.slice(minIndent))
		.join("\n")
		.trim();
}

function extractPiPkmPromptFromPython(content: string): string | undefined {
	const assignmentAlternatives = PKM_PROMPT_ASSIGNMENT_CANDIDATES.map((name) => escapeRegExp(name)).join("|");
	const assignmentRe = new RegExp(
		`(?:^|\\n)\\s*(?:${assignmentAlternatives})\\s*=\\s*(?:[rRuUbBfF]{0,2})?(\"\"\"[\\s\\S]*?\"\"\"|'''[\\s\\S]*?''')`,
	);

	const assignmentMatch = content.match(assignmentRe);
	if (assignmentMatch?.[1]) {
		return dedent(stripTripleQuotes(assignmentMatch[1]));
	}

	const firstBlock = content.match(TRIPLE_QUOTE_BLOCK_RE);
	if (firstBlock?.[1]) {
		return dedent(stripTripleQuotes(firstBlock[1]));
	}

	return undefined;
}

function getDefaultPiPkmPromptPaths(): string[] {
	const promptSourceRoot = join(homedir(), "code", "aiderx", "aider");
	return [
		join(promptSourceRoot, "extensions", "handlers", "pkm_handler.py"),
		join(promptSourceRoot, "coders", "pkm_prompts.py"),
		join(promptSourceRoot, "coders", "pkm_coder.py"),
	];
}

function normalizePromptPath(path: string): string {
	const trimmed = path.trim();
	if (trimmed === "~") return homedir();
	if (trimmed.startsWith("~/")) return join(homedir(), trimmed.slice(2));
	if (trimmed.startsWith("~")) return join(homedir(), trimmed.slice(1));
	return trimmed;
}

function resolvePiPkmPrompt(promptPaths: string[]): ResolvedPiPkmPrompt {
	for (const path of promptPaths) {
		const promptPath = normalizePromptPath(path);
		if (!existsSync(promptPath)) {
			continue;
		}

		try {
			const content = readFileSync(promptPath, "utf-8");
			const extractedPrompt = extractPiPkmPromptFromPython(content);
			if (extractedPrompt && extractedPrompt.length > 0) {
				return { prompt: extractedPrompt, source: promptPath };
			}
		} catch {
			// Ignore and continue to fallback path(s)
		}
	}

	return { prompt: DEFAULT_PI_PKM_PROMPT, source: "builtin-default" };
}

function parsePkmModeEntry(entries: ReturnType<ExtensionContext["sessionManager"]["getEntries"]>): boolean | undefined {
	for (let index = entries.length - 1; index >= 0; index--) {
		const entry = entries[index] as { type?: string; customType?: string; data?: unknown };
		if (entry.type !== "custom" || entry.customType !== "pkm-mode") {
			continue;
		}

		const data = entry.data;
		if (!data || typeof data !== "object") {
			return undefined;
		}
		const enabled = (data as { enabled?: unknown }).enabled;
		if (typeof enabled === "boolean") {
			return enabled;
		}
		return undefined;
	}

	return undefined;
}

function updateStatus(ctx: ExtensionContext, enabled: boolean): void {
	if (!ctx.hasUI) {
		return;
	}
	ctx.ui.setStatus("pkm-mode", enabled ? ctx.ui.theme.fg("accent", "PKM") : undefined);
}

export default function piPkmModeExtension(pi: ExtensionAPI): void {
	const state: PkmModeState = {
		enabled: false,
		prompt: DEFAULT_PI_PKM_PROMPT,
		promptSource: "builtin-default",
	};

	pi.registerFlag("pkm", {
		description: "Start in pi PKM mode",
		type: "boolean",
		default: false,
	});

	pi.registerFlag("pkm-prompt-path", {
		description: "Path to PKM prompt python file",
		type: "string",
	});

	const resolvePrompt = (): void => {
		const customPathFlag = pi.getFlag("pkm-prompt-path");
		const customPath =
			typeof customPathFlag === "string" && customPathFlag.trim() ? customPathFlag.trim() : undefined;
		const paths = customPath ? [customPath, ...getDefaultPiPkmPromptPaths()] : getDefaultPiPkmPromptPaths();
		const resolved = resolvePiPkmPrompt(paths);
		state.prompt = resolved.prompt;
		state.promptSource = resolved.source;
	};

	const persistState = (): void => {
		pi.appendEntry("pkm-mode", { enabled: state.enabled });
	};

	pi.registerCommand("pkm", {
		description: "Toggle pi PKM mode (or use: /pkm on|off|status)",
		handler: async (args, ctx) => {
			const normalized = args.trim().toLowerCase();

			if (normalized === "status") {
				if (ctx.hasUI) {
					ctx.ui.notify(`PKM mode ${state.enabled ? "enabled" : "disabled"}. Prompt: ${state.promptSource}`);
				}
				updateStatus(ctx, state.enabled);
				return;
			}

			if (normalized === "on" || normalized === "enable" || normalized === "enabled") {
				state.enabled = true;
			} else if (normalized === "off" || normalized === "disable" || normalized === "disabled") {
				state.enabled = false;
			} else if (normalized.length > 0) {
				state.enabled = true;
				persistState();
				updateStatus(ctx, state.enabled);
				if (ctx.hasUI) {
					ctx.ui.notify(`PKM mode enabled (${state.promptSource})`, "info");
				}
				pi.sendUserMessage(args.trim());
				return;
			} else {
				state.enabled = !state.enabled;
			}

			persistState();
			updateStatus(ctx, state.enabled);
			if (ctx.hasUI) {
				ctx.ui.notify(state.enabled ? `PKM mode enabled (${state.promptSource})` : "PKM mode disabled", "info");
			}
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		resolvePrompt();

		if (pi.getFlag("pkm") === true) {
			state.enabled = true;
		}

		const persistedEnabled = parsePkmModeEntry(ctx.sessionManager.getEntries());
		if (persistedEnabled !== undefined) {
			state.enabled = persistedEnabled;
		}

		updateStatus(ctx, state.enabled);
	});

	pi.on("before_agent_start", async (event) => {
		if (!state.enabled) {
			return undefined;
		}

		return {
			systemPrompt: `${event.systemPrompt}\n\n${state.prompt}`,
		};
	});
}
