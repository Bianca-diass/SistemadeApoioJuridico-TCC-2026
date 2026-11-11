
import {
  fazerLogin,
  fazerCadastro,
  fazerLogout,
  observarUsuario,
} from "../services/authService.js";

class AuthController {
  constructor() {
    this._logado = false;
    this._usuario = null;
    this._ouvintes = [];

    // Recupera o usuário salvo na sessão.
    observarUsuario((usuario) => {
      this._usuario = usuario;
      this._logado = !!usuario;
      this._notificar();
    });
  }

  get logado() {
    return this._logado;
  }

  get usuario() {
    return this._usuario;
  }

  // LOGIN COM SUPABASE
  async login(email, senha) {
    try {
      const resposta = await fazerLogin(email, senha);

      const usuario = resposta.usuario || resposta;

      if (!usuario) {
        throw new Error("Não foi possível identificar o usuário.");
      }

      this._usuario = usuario;
      this._logado = true;

      this._notificar();

      return usuario;

    } catch (erro) {
      console.error("Erro no login:", erro);
      throw erro;
    }
  }

  // CADASTRO COM SUPABASE
  async cadastrar(email, senha, dadosExtras = {}) {
    try {
      const resposta = await fazerCadastro(
        email,
        senha,
        dadosExtras
      );

      const usuario = resposta.usuario || resposta;

      this._usuario = usuario;
      this._logado = true;

      this._notificar();

      return usuario;

    } catch (erro) {
      console.error("Erro no cadastro:", erro);
      throw erro;
    }
  }

  // LOGOUT
  async logout() {
    try {
      await fazerLogout();

      this._usuario = null;
      this._logado = false;

      this._notificar();

    } catch (erro) {
      console.error("Erro ao sair:", erro);
      throw erro;
    }
  }

  // OBSERVAR ALTERAÇÕES DE AUTENTICAÇÃO
  onChange(callback) {
    this._ouvintes.push(callback);

    return () => {
      this._ouvintes = this._ouvintes.filter(
        (cb) => cb !== callback
      );
    };
  }

  // NOTIFICAR COMPONENTES
  _notificar() {
    this._ouvintes.forEach((callback) => {
      callback(this._logado, this._usuario);
    });
  }
}

export const authController = new AuthController();
