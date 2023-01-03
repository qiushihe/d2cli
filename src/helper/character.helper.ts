import * as R from "ramda";

import { BungieApiDestiny2CharacterComponent } from "~src/service/destiny2-character/destiny2-character.types";
import { BungieApiDestiny2StatDefinitions } from "~src/service/destiny2-manifest/destiny2-manifest.types";

const propOf =
  <V>(obj: Record<string | number, V>) =>
  (prop: string): V =>
    obj[prop] as V;

const statProp = <T extends [string, number]>(def: any, statProp: string): ((obj: T) => R.Ord) =>
  R.pipe(R.prop<string>(0), propOf(def), R.propOr(Infinity, statProp) as (src: unknown) => string);

export const sortedStats =
  (statDefinitions: BungieApiDestiny2StatDefinitions) =>
  (character: BungieApiDestiny2CharacterComponent): [string, number, string, string][] => {
    return R.pipe(
      R.prop("stats"),
      R.toPairs,
      R.sortWith([
        R.descend(statProp(statDefinitions, "statCategory")),
        R.ascend(statProp(statDefinitions, "index"))
      ]),
      R.map<[string, number], [string, number, string, string]>(([key, value]) => [
        key,
        value,
        statDefinitions[parseInt(key)]?.displayProperties?.name || `Unknown (${key})`,
        R.pipe(
          R.split("\n"),
          R.filter(
            R.cond([
              [R.pipe(R.trim, R.equals("")), R.F],
              [R.T, R.T]
            ])
          ),
          R.join("\n")
        )(statDefinitions[parseInt(key)]?.displayProperties?.description || "")
      ])
    )(character);
  };
