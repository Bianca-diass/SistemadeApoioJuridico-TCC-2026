// ==========================================================
// OAB EM CAMPO ÚNICO: "29588/MS"
// ==========================================================
// A mesma regra é aplicada no back-end (backend/src/utils/oab.js).

export const UFS = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
    "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

// Aceita: 29588/MS, 29588-MS, 29588 MS, 29.588/ms
const REGEX_OAB = /^(\d[\d.]{0,7})\s*[\/\-\s]\s*([A-Za-z]{2})$/;


// Texto -> { numero, uf, completo } ou null se for inválido
export function parseOab(texto) {

    if (typeof texto !== "string") return null;

    const m = texto.trim().match(REGEX_OAB);

    if (!m) return null;

    const numero = m[1].replace(/\./g, "").replace(/^0+/, "");
    const uf = m[2].toUpperCase();

    if (!/^[1-9]\d{0,5}$/.test(numero)) return null;
    if (!UFS.includes(uf)) return null;

    return { numero, uf, completo: `${numero}/${uf}` };
}


// Devolve a mensagem de erro, ou "" quando está tudo certo
export function validarOab(texto) {

    if (typeof texto !== "string" || !texto.trim()) {
        return "Informe a OAB.";
    }

    if (!parseOab(texto)) {
        return "OAB inválida. Use o formato número/UF, por exemplo 29588/MS.";
    }

    return "";
}


export function formatarOab(numero, uf) {

    if (!numero || !uf) return "";

    return `${numero}/${String(uf).toUpperCase()}`;
}


// OAB completa de um usuário (usa número/UF; se for cadastro antigo, usa o texto)
export function oabDoUsuario(usuario) {

    if (!usuario) return "";

    return (
        formatarOab(usuario.oab_numero, usuario.oab_uf) ||
        usuario.oab ||
        ""
    );
}


// Máscara enquanto digita: até 6 números, "/" e 2 letras
export function mascaraOab(valor) {

    const texto = String(valor ?? "").toUpperCase();

    const numeros = (texto.match(/^\d{0,6}/) || [""])[0];

    const resto = texto.slice(numeros.length);

    const letras = resto.replace(/[^A-Z]/g, "").slice(0, 2);

    if (!numeros) return "";

    if (letras) return `${numeros}/${letras}`;

    return resto.includes("/") ? `${numeros}/` : numeros;
}


// Liga a máscara a um <input>
export function aplicarMascaraOab(input) {

    if (!input) return;

    input.setAttribute("maxlength", "9");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("inputmode", "text");

    input.addEventListener("input", () => {
        input.value = mascaraOab(input.value);
    });
}