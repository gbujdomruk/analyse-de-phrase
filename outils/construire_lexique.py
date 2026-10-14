"""Construit data/lexique.json a partir de Lexique 3.83 (www.lexique.org).

Usage : python3 outils/construire_lexique.py chemin/vers/Lexique383.tsv

Seules les classes ouvertes (nom, adjectif, verbe, adverbe, interjection)
sont reprises : les mots grammaticaux (determinants, pronoms, prepositions,
conjonctions) sont decrits a la main dans js/data/mots-outils.js, car les
etiquettes de Lexique ne suivent pas la terminologie scolaire.

Format de sortie : { forme: "entree;entree;..." } ou chaque entree vaut
  categorie|lemme|genre|nombre|formes-verbales (separees par des virgules)|rare
"""
import csv
import json
import sys
from collections import defaultdict

CATEGORIES = {
    "NOM": "nom",
    "ADJ": "adj",
    "VER": "verbe",
    "AUX": "aux",
    "ADV": "adv",
    "ONO": "interj",
}


def main(source, destination):
    formes = defaultdict(list)
    with open(source, encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            cat = CATEGORIES.get(r["cgram"])
            if not cat or not r["ortho"]:
                continue
            freq = float(r["freqfilms2"] or 0) + float(r["freqlivres"] or 0)
            lemme = r["lemme"] if cat in ("verbe", "aux") else ""
            entree = "|".join([
                cat,
                lemme,
                r["genre"],
                r["nombre"],
                r["infover"].strip(";").replace(":", ".").replace(";", ","),
                "r" if freq < 0.5 else "",
            ]).rstrip("|")
            if entree not in formes[r["ortho"]]:
                formes[r["ortho"]].append(entree)
    sortie = {forme: ";".join(entrees) for forme, entrees in sorted(formes.items())}
    with open(destination, "w", encoding="utf-8") as f:
        json.dump(sortie, f, ensure_ascii=False, separators=(",", ":"))
    print(len(sortie), "formes ecrites dans", destination)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "data/lexique.json")
