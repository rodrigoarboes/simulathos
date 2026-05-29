var Catalogo = (function() {
    var ativos = [
        // Renda Variável Brasil
        { ticker: "BOVA11", nome: "iShares Ibovespa", classe: "rv-br", descricao: "Ibovespa" },
        { ticker: "BOVV11", nome: "It Now Ibovespa", classe: "rv-br", descricao: "Ibovespa" },
        { ticker: "SMAL11", nome: "iShares Small Cap", classe: "rv-br", descricao: "Small Caps BR" },
        { ticker: "DIVO11", nome: "It Now Dividendos", classe: "rv-br", descricao: "Dividendos BR" },

        // Renda Variável Internacional
        { ticker: "IVVB11", nome: "iShares S&P 500", classe: "rv-intl", descricao: "S&P 500 (USD)" },
        { ticker: "NASD11", nome: "It Now Nasdaq", classe: "rv-intl", descricao: "Nasdaq 100 (USD)" },
        { ticker: "ACWI11", nome: "iShares ACWI", classe: "rv-intl", descricao: "Ações Globais" },
        { ticker: "EURP11", nome: "It Now Europa", classe: "rv-intl", descricao: "Ações Europa" },

        // Renda Fixa / Imobiliário
        { ticker: "IMAB11", nome: "It Now IMA-B", classe: "rf", descricao: "Inflação (NTN-B)" },
        { ticker: "B5P211", nome: "It Now IMA-B5+", classe: "rf", descricao: "IPCA+ longo" },
        { ticker: "IB5M11", nome: "It Now IMA-B5", classe: "rf", descricao: "IPCA+ médio" },
        { ticker: "IRFM11", nome: "It Now IRF-M", classe: "rf", descricao: "Prefixado" },
        { ticker: "FIXA11", nome: "Mirae RF", classe: "rf", descricao: "Pós-fixado CDI" },
        { ticker: "LFTS11", nome: "Investo Tesouro Selic", classe: "rf", descricao: "Tesouro Selic" },
        { ticker: "XFIX11", nome: "iShares IFIX", classe: "imob", descricao: "Fundos Imobiliários" }
    ];

    var benchmarks = [
        { id: "cdi", nome: "CDI", cor: "#14B550" },
        { id: "ibov", nome: "Ibovespa", cor: "#E67E22" },
        { id: "ipca5", nome: "IPCA + 5%", cor: "#8E44AD" }
    ];

    var classes = {
        "rv-br": { nome: "Renda Variável Brasil", cor: "#010E30" },
        "rv-intl": { nome: "Renda Variável Internacional", cor: "#2980B9" },
        "rf": { nome: "Renda Fixa", cor: "#27AE60" },
        "imob": { nome: "Imobiliário", cor: "#E67E22" }
    };

    function porClasse(classe) {
        return ativos.filter(function(a) { return a.classe === classe; });
    }

    function porTicker(ticker) {
        return ativos.find(function(a) { return a.ticker === ticker; }) || null;
    }

    return { ativos: ativos, benchmarks: benchmarks, classes: classes, porClasse: porClasse, porTicker: porTicker };
})();
