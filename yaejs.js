const Yaejs = (function() {
  function escapeHtml(r) {
    return String(r)
      .replace(/&(?!\w+;)/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const TokenTypes = {
    PUTS: 'PUTS',
    ESCAPEPUTS: 'ESCAPEPUTS',
    JS: 'JS',
    HTML: 'HTML',
    EOF: 'EOF'
  };

  class Token {
    constructor(Type, Value, At, Lineat, Lineno) {
      this.Type = Type;
      this.Value = Value;
      this.At = At;
      this.Lineat = Lineat;
      this.Lineno = Lineno;
    }
  }

  class Lexer {
    constructor(html) {
      if (typeof html !== 'string') {
        throw new TypeError(`arguments[0] is required to be type string`);
      }
      this.at = 0;
      this.lineat = 0;
      this.input = html;
      this.ch = undefined;
      this.lineno = 1;
      this.readChar();
    }
    readChar() {
      this.ch = this.input[this.at];
      if (this.at < this.input.length) {
        this.at++;
      }
      if (this.ch === '\n') {
        this.lineno++;
        this.lineat = this.at;
      }
    }
    peekChar(n = 0) {
      return this.input[this.at + n];
    }
    nextToken() {
      let tok;
      if (!this.ch) {
        tok = new Token(
          TokenTypes.EOF,
          undefined,
          this.at,
          this.at - this.lineat,
          this.lineno
        );
      } else if (this.ch === '<' && this.peekChar() === '%') {
        this.readChar();
        this.readChar();
        switch (this.ch) {
          case '=': {
            const At = this.at;
            const Lineno = this.lineno;
            const Lineat = this.at - this.lineat;
            this.readChar();
            let Value = '';
            while (!!this.ch && !(this.ch === '%' && this.peekChar() === '>')) {
              Value += this.ch;
              this.readChar();
            }

            this.readChar();

            tok = new Token(TokenTypes.ESCAPEPUTS, Value, At, Lineat, Lineno);
            break;
          }
          case '-': {
            const At = this.at;
            const Lineno = this.lineno;
            const Lineat = this.at - this.lineat;
            this.readChar();
            let Value = '';
            while (!!this.ch && !(this.ch === '%' && this.peekChar() === '>')) {
              Value += this.ch;
              this.readChar();
            }

            this.readChar();

            tok = new Token(TokenTypes.PUTS, Value, At, Lineat, Lineno);
            break;
          }
          default: {
            const At = this.at;
            const Lineno = this.lineno;
            const Lineat = this.at - this.lineat;
            let Value = '';
            while (!!this.ch && !(this.ch === '%' && this.peekChar() === '>')) {
              Value += this.ch;
              this.readChar();
            }
            this.readChar();
            tok = new Token(TokenTypes.JS, Value, At, Lineat, Lineno);
          }
        }
      } else {
        const At = this.at;
        const Lineno = this.lineno;
        const Lineat = this.at - this.lineat;
        let Value = '';
        while (this.ch && !(this.ch === '<' && this.peekChar() === '%')) {
          Value += this.ch;
          this.readChar();
        }
        tok = new Token(TokenTypes.HTML, Value, At, Lineat, Lineno);
        return tok;
      }
      this.readChar();
      return tok;
    }
    expectPeek(ch) {
      if (this.peekChar() === ch) {
        this.readChar();
        return true;
      }
      return false;
    }
  }

  function rethrow(err, lineat, lineno, filename) {
    err.path = filename;
    err.message =
      err.message +
      [``, `Compile Error: `, `LineNo: ${lineno}`, `Lineat: ${lineat}`].join(
        '\n'
      );
    throw err;
  }

  const Yaejs = {
    parse(html) {
      const l = new Lexer(html);
      const buf = ['var buf = [];', '\nwith(locals) {'];
      let tok;
      for (
        tok = l.nextToken();
        !!tok && tok.Type !== TokenTypes.EOF;
        tok = l.nextToken()
      ) {
        buf.push(
          `\n__trackInfo.lineno = ${tok.Lineno}; __trackInfo.lineat = ${
            tok.Lineat
          };`
        );
        switch (tok.Type) {
          case TokenTypes.HTML:
            buf.push(`\nbuf.push(${JSON.stringify(tok.Value)});`);
            break;
          case TokenTypes.ESCAPEPUTS:
            buf.push(`\nbuf.push(escape(${tok.Value}));`);
            break;
          case TokenTypes.PUTS:
            buf.push(`\nbuf.push(${tok.Value});`);
            break;
          case TokenTypes.JS:
            buf.push(`\n${tok.Value}`);
            break;
        }
      }
      buf.push(`\n};\nreturn buf.join('')`);
      return buf.join('');
    },
    compile(html) {
      const str = [
        `var __trackInfo = {input: ${JSON.stringify(
          html
        )}, lineno: 1, lineat: 0};`,
        '\n' + rethrow.toString(),
        '\ntry {',
        '\n',
        this.parse(html),
        '\n} catch (err) {',
        '\nrethrow(err, __trackInfo.lineat, __trackInfo.lineno);',
        '\n}'
      ].join('');
      const fn = new Function('locals, escape, ', str);
      return function(locals = {}) {
        return fn.call(this, locals, escapeHtml);
      };
    }
  };
  return Yaejs;
})();
