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
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

const DEFAULT_PI_PKM_PROMPT = `You are an expert personal knowledge manager.
Your goal is to help me organize my thoughts, ideas, and knowledge into a structured set of files.
You will be creating and editing markdown files.
When I share ideas with you, you should help me clarify them and then save them to the appropriate files.
You can ask me questions to better understand where to save the information or how to structure it.
Focus on creating a well-organized and easy-to-navigate knowledge base.
Do not write code unless I explicitly ask you to.`;

interface PkmModeState {
	enabled: boolean;
	prompt: string;
	promptSource: string;
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
		promptSource: "embedded",
	};

	pi.registerFlag("pkm", {
		description: "Start in pi PKM mode",
		type: "boolean",
		default: false,
	});

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
			}
			state.enabled = !state.enabled;

			persistState();
			updateStatus(ctx, state.enabled);
			if (ctx.hasUI) {
				ctx.ui.notify(state.enabled ? `PKM mode enabled (${state.promptSource})` : "PKM mode disabled", "info");
			}
		},
	});

	pi.on("session_start", async (_event, ctx) => {
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
