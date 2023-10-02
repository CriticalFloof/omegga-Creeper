import Command, { TrustLevel } from "src/lib/commands";
import { Runtime } from "../main";

const yesAliases = ["yes", "y"];
for (let i = 0; i < yesAliases.length; i++) {
    const yesName = yesAliases[i];
    new Command(yesName, TrustLevel.Default, (speaker: string) => {
        if (!Command.hasPendingDefer(speaker)) {
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> You don't have any commands to respond to.`);
            return;
        }
        Command.resolveDefer(speaker);
    });
}

const noAliases = ["no", "n"];
for (let i = 0; i < noAliases.length; i++) {
    const noName = noAliases[i];
    new Command(noName, TrustLevel.Default, (speaker: string) => {
        if (!Command.hasPendingDefer(speaker)) {
            Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> You don't have any commands to respond to.`);
            return;
        }
        Command.rejectDefer(speaker);
    });
}

new Command("respond", TrustLevel.Default, (speaker: string, ...responce: string[]) => {
    if (!Command.hasPendingDefer(speaker)) {
        Runtime.omegga.whisper(speaker, `<size="10"><color="00FFFF">\></></> You don't have any commands to respond to.`);
        return;
    }
    Command.resolveDefer(speaker, responce);
});
