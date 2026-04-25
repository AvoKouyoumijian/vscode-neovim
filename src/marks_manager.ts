import vscode, {
    Disposable,
    Uri,
    TextEditorDecorationType,
    TextEditor,
} from "vscode";

import { eventBus, EventBusData } from "./eventBus";
import { createLogger } from "./logger";
import { disposeAll } from "./utils";
import { MainController } from "./main_controller";

const logger = createLogger("MarksManager");

interface Mark {
    mark: string;
    pos: number[];
    file?: string;
}

export class MarksManager implements Disposable {
    private disposables: Disposable[] = [];

    private labelToDecType = new Map<string, TextEditorDecorationType>();

    constructor(private readonly main: MainController) {
        this.disposables.push(
            eventBus.on("update-marks", this.handleMarkUpdate, this),
        );
        // this.eventEmitter.fire(null);
    }

    private async handleMarkUpdate(_event: EventBusData<"update-marks">) {
        // get marks in buffer
        const localMarks = (await this.main.client.lua(
            "return vim.fn.getmarklist(vim.api.nvim_get_current_buf())",
        )) as Mark[];

        let globalMarks = (await this.main.client.callFunction(
            "getmarklist",
            [],
        )) as Mark[];

        const curBuf = (await this.main.client.lua(
            "return vim.api.nvim_get_current_buf()",
        )) as number;

        logger.info(await this.main.client.lua("return _G.changed"));

        globalMarks = globalMarks.filter((m) => {
            return m.pos[0] === curBuf;
        });

        let allMarks = [...localMarks, ...globalMarks];
        allMarks = allMarks.filter((m) => {
            return /^'[a-zA-Z]$/.test(m.mark);
        });

        // remove prior states marks from screen
        let type: TextEditorDecorationType;
        const editor = vscode.window.activeTextEditor as TextEditor;

        this.labelToDecType.forEach((v, _) => editor.setDecorations(v, []));

        allMarks.forEach((mark) => {
            const line = mark.pos[1] - 1;
            const label = mark.mark.slice(1);
            const iconFillColor = "#157EFB";

            if (!this.labelToDecType.has(label)) {
                const iconPath = Uri.parse(
                    `data:image/svg+xml,${encodeURIComponent(
                        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="${iconFillColor}" class="size-6"> <path fill-rule="evenodd" d="M6.32 2.577a49.255 49.255 0 0 1 11.36 0c1.497.174 2.57 1.46 2.57 2.93V21a.75.75 0 0 1-1.085.67L12 18.089l-7.165 3.583A.75.75 0 0 1 3.75 21V5.507c0-1.47 1.073-2.756 2.57-2.93Z" clip-rule="evenodd" /> <text x="12" y="10" fill="#ffffff" font-family="Arial, sans-serif" font-size="10px" font-weight="bold" text-anchor="middle" dominant-baseline="central"> ${label} </text> </svg>`,
                    )}`,
                );
                type = vscode.window.createTextEditorDecorationType({
                    gutterIconPath: iconPath,
                });
                this.labelToDecType.set(label, type);
            } else {
                type = this.labelToDecType.get(
                    label,
                ) as TextEditorDecorationType;
            }
            editor?.setDecorations(type, [
                {
                    range: new vscode.Range(line, 0, line, 0),
                },
            ]);
        });

        logger.info("makres-updated", allMarks);
    }

    dispose() {
        disposeAll(this.disposables);
    }
}
