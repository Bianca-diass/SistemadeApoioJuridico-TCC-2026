import {
    cadastrarDocumento,
    listarDocumentos,
    editarDocumento,
    excluirDocumento
} from "../services/documentoService.js";

class DocumentoController {
    constructor() {
        this._documentos = [];
        this._ouvintes = [];
        this._carregando = false;
    }

    get documentos() {
        return this._documentos;
    }

    get carregando() {
        return this._carregando;
    }

    async carregar() {
        this._carregando = true;

        try {
            const documentos = await listarDocumentos();

            this._documentos = Array.isArray(documentos)
                ? documentos
                : [];

            this._notificar();

            return this._documentos;
        } finally {
            this._carregando = false;
        }
    }

    async cadastrarDocumento(documento) {
        const resultado = await cadastrarDocumento(documento);

        await this.carregar();

        return resultado;
    }

    async editarDocumento(id, dadosAtualizados) {
        const resultado = await editarDocumento(
            id,
            dadosAtualizados
        );

        await this.carregar();

        return resultado;
    }

    async removerDocumento(id) {
        await excluirDocumento(id);

        this._documentos = this._documentos.filter(
            documento => String(documento.id) !== String(id)
        );

        this._notificar();
    }

    onChange(callback) {
        if (typeof callback !== "function") {
            return () => {};
        }

        this._ouvintes.push(callback);

        return () => {
            this._ouvintes = this._ouvintes.filter(
                ouvinte => ouvinte !== callback
            );
        };
    }

    _notificar() {
        this._ouvintes.forEach(callback => {
            try {
                callback(this._documentos);
            } catch (erro) {
                console.error(
                    "Erro ao atualizar a tela de documentos:",
                    erro
                );
            }
        });
    }
}

export const documentoController = new DocumentoController();