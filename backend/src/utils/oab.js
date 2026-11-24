// backend/src/utils/oab.js
//
// Regras da OAB no formato "NÚMERO/UF" (ex.: 29588/MS).
// O mesmo formato é validado no front-end (FrontEnd/js/utils/oab.js),
// mas é este arquivo que vale: o back-end nunca confia no front.

const UFS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

// Aceita: 29588/MS, 29588-MS, 29588 MS, 29.588/ms
const REGEX_OAB = /^(\d[\d.]{0,7})\s*[\/\-\s]\s*([A-Za-z]{2})$/;

// Converte o texto em { numero, uf, completo } ou null se for inválido.
function parseOab(texto) {

    if (typeof texto !== "string") return null;

    const m = texto.trim().match(REGEX_OAB);

    if (!m) return null;

    // "029.588" -> "29588"
    const numero = m[1].replace(/\./g, "").replace(/^0+/, "");
    const uf = m[2].toUpperCase();

    if (!/^[1-9]\d{0,5}$/.test(numero)) return null;
    if (!UFS.includes(uf)) return null;

    return { numero, uf, completo: `${numero}/${uf}` };
}

// { ok, erro, numero, uf, completo }
function validarOab(texto) {

    if (typeof texto !== "string" || !texto.trim()) {
        return { ok: false, erro: "Informe a OAB." };
    }

    const dados = parseOab(texto);

    if (!dados) {
        return {
            ok: false,
            erro: "OAB inválida. Use o formato número/UF, por exemplo 29588/MS."
        };
    }

    return { ok: true, ...dados };
}

function formatarOab(numero, uf) {

    if (!numero || !uf) return "";

    return `${numero}/${String(uf).toUpperCase()}`;
}

// Monta a OAB completa de uma linha da tabela "advogados".
// Se a linha ainda é antiga (só tem o texto em "oab"), usa o texto.
function oabDoPerfil(advogado) {

    if (!advogado) return "";

    return (
        formatarOab(advogado.oab_numero, advogado.oab_uf) ||
        advogado.oab ||
        ""
    );
}

module.exports = {
    UFS,
    parseOab,
    validarOab,
    formatarOab,
    oabDoPerfil
};