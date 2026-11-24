// js/controllers/documentoController.js

import {
  cadastrarDocumento,
  listarDocumentos,
  editarDocumento,
  excluirDocumento,
} from "../services/documentoService.js";

class DocumentoController {
  constructor() {
    this._documentos = [];
    this._ouvintes = [];
  }

  get documentos() {
    return this._documentos;
  }

  async carregar() {
    this._documentos = await listarDocumentos();
    this._notificar();
  }

  // Devolve { mensagem, id } para quem precisar do id do documento criado
  async cadastrarDocumento(documento) {
    return await cadastrarDocumento(documento);
  }

  async editarDocumento(id, dadosAtualizados) {
    await editarDocumento(id, dadosAtualizados);
  }

  async removerDocumento(id) {
    await excluirDocumento(id);
    this._documentos = this._documentos.filter((doc) => doc.id !== id);
    this._notificar();
  }

  onChange(callback) {
    this._ouvintes.push(callback);
    return () => {
      this._ouvintes = this._ouvintes.filter((cb) => cb !== callback);
    };
  }

  _notificar() {
    this._ouvintes.forEach((cb) => cb(this._documentos));
  }
}

export const documentoController = new DocumentoController();