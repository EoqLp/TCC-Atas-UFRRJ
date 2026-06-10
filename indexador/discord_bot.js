const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
require('dotenv').config();

// ==========================================
// ⚙️ 1. CONFIGURAÇÕES INICIAIS (Altere aqui)
// ==========================================
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const BOTPRESS_PORT = "3001"; 
const BOT_ID = "tcc-buscador-de-atas"; 
const CANAL_PERMITIDO_ID = "1511531019499471053"; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Memória temporária para guardar as últimas opções dos menus numéricos
const memoriaOpcoesUsuarios = new Map();

// ==========================================
// 🛑 2. LISTA DE STOP WORDS & GÍRIAS
// ==========================================
const stopWordsList = [
    'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'ao', 'à', 'aos', 'às', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'pelo', 'pela', 'pelos', 'pelas', 'pro', 'pra', 'd', 'q', 'ñ', 'num', 'msm',
    'eu', 'tu', 'ele', 'ela', 'nós', 'vós', 'eles', 'elas', 'me', 'mim', 'comigo', 'te', 'ti', 'contigo', 'se', 'si', 'consigo', 'lhe', 'nos', 'vos', 'lhes', 'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas', 'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas', 'vosso', 'vossa', 'vossos', 'vossas', 'vcs', 'vc', 'cê', 'ce', 'c',
    'de', 'em', 'por', 'para', 'com', 'sem', 'sob', 'sobre', 'entre', 'até', 'desde', 'contra', 'perante', 'através', 'além', 'dentro', 'fora', 'perto', 'longe', 'durante',
    'e', 'mas', 'ou', 'porque', 'pois', 'que', 'se', 'como', 'quando', 'embora', 'porém', 'todavia', 'contudo', 'então', 'também', 'apesar', 'caso', 'além disso', 'portanto', 'logo', 'ainda que', 'a fim de', 'com o objetivo de', 'tanto quanto', 'bem como', 'a menos que', 'a não ser que', 'conforme', 'à medida que', 'sempre que', 'logo que', 'assim que', 'uma vez que', 'na medida em que', 'de modo que', 'de forma que', 'caso contrário', 'fora isso', 'além do mais', 'por outro lado', 'por um lado', 'de uma forma ou de outra', 'apesar de tudo', 'ao contrário', 'em contrapartida', 'em compensação', 'por isso mesmo', 'desse modo', 'desta forma', 'assim sendo', 'por consequência', 'consequentemente', 'para tanto', 'aliás', 'inclusive', 'ademais', 'com isso', 'por assim dizer', 'em suma', 'afinal', 'a fim de que', 'de modo a',
    'ser', 'estar', 'ter', 'haver', 'ir', 'vir', 'fazer', 'poder', 'dever', 'querer', 'saber', 'está', 'estão', 'tem', 'tenho', 'é', 'tá', 'tô', 'tamos', 'tamo', 'vamo', 'vambora', 'partiu', 'bora', 'bora lá',
    'esse', 'essa', 'isso', 'este', 'esta', 'isto', 'aquele', 'aquela', 'aquilo', 'aqueles', 'aquelas', 'deste', 'desta', 'destes', 'destas', 'disso', 'daquilo', 'nisto', 'naquilo',
    'lá', 'aqui', 'ali', 'onde', 'aonde', 'aki', 'cadê', 'tipo', 'né', 'aí', 'pois é', 'quer dizer', 'sabe', 'entende', 'sacou', 'tá ligado', 'ok', 'okay', 'tranquilo', 'suave', 'de boa', 'fechou', 'combinado', 'entendido', 'tipo assim',
    'ah', 'oh', 'ei', 'oi', 'olá', 'opa', 'eita', 'nossa', 'caramba', 'poxa', 'uau', 'xi', 'ih', 'ué', 'hein', 'que que é isso', 'quê', 'e aí', 'fala', 'fala aí', 'fala tu', 'salve', 'quali', 'como vai', 'como tá', 'tudo bem', 'tudo bom', 'eae', 'coé', 'alô', 'po', 'uai', 'oxe', 'oxi', 'vey', 'vix', 'vish', 'ôxe',
    'cara', 'mano', 'mina', 'véi', 'velho', 'brother', 'meu chapa', 'mano do céu', 'parça', 'parceiro', 'camarada', 'meu rei', 'minha rainha', 'bro', 'meu anjo', 'fera', 'chefe', 'paizão', 'mainha', 'veinho', 'velhinho', 'moleque', 'garoto', 'menino', 'menina', 'guri', 'guria', 'piá', 'piázinho', 'gajo', 'gaja', 'bacana', 'maneiro', 'massa', 'show', 'top', 'legal', 'beleza', 'joia', 'firmeza', 'daora', 'dahora', 'da hora', 'responsa', 'sinistro', 'brabo', 'brabíssimo', 'irado', 'supimpa', 'bala', 'zica', 'animal', 'monstro', 'mito', 'lenda', 'bão', 'ocê', 'oxente', 'painho', 'égua', 'bah', 'tchê', 'aham', 'ahã', 'orra meu', 'home', 'homi', 'muié', 'muler', 'visse', 'num é', 'nera', 'bixim', 'causo', 'sô',
    'pq', 'tb', 'tbm', 'mt', 'mto', 'mta', 'td', 'tdo', 'tda', 'hj', 'amg', 'amigo', 'amiga', 'bjs', 'bjss', 'bjo', 'bjao', 'vlw', 'flw', 'fvr', 'por favor', 'abs', 'vdd', 'aff', 'pfv', 'pfvr', 'sla', 'slc', 'sdds', 'tmj', 'tamo junto', 'fds', 'findi', 'blz', 'bele', 'falou', 'falows', 'fmz', 'fmza', 'mds', 'falô', 'blza', 'sup', 'obg', 'pls', 'sdd', 'pqn', 'pqns', 'agr',
    's', 'n', 'yep', 'nop', 'ahan', 'nops', 'de jeito nenhum', 'com certeza', 'claro', 'óbvio', 'lógico', 'evidente', 'sem dúvida', 'quem sabe', 'vai ver', 'pode ser', 'bastante', 'pra caramba', 'pra cacete', 'pra dedéu', 'pácas', 'biga', 'uma porrada', 'um monte', 'um tantão', 'um bocado', 'um tiquinho', 'um cadinho', 'um tico', 'uma belezura', 'será', 'será mesmo', 'não sei não', 'tô na dúvida', 'to em dúvida', 'vai saber', 'sei lá', 'não faço ideia', 'nem imagino',
    'tchau', 'até logo', 'até mais', 'fui', 'to indo', 'té mais', 'inté', 'bye', 'xau', 'beijo', 'abraço', 'abç', 'fique com Deus', 'vai com Deus', 'se cuida', 'se cuide', 'fica bem', 'fique bem', 'rs', 'kkkk', 'haha', 'hehe', 'lol', 'risos', 'kkk', 'hahaha', 'postar', 'post', 'stories', 'story', 'feed', 'timeline', 'curtir', 'like', 'reagir', 'compartilhar', 'share', 'seguir', 'follow', 'unfollow', 'bio', 'trending', 'viral', 'viralizar', 'tá bom', 'tá bem', 'tá certo', 'pode crer', 'tô dentro', 'topo', 'vamos', 'tá de boa', 'tá nada', 'que nada', 'nem a pau', 'nem ferrando', 'nem morto', 'nem que a vaca tussa', 'tá louco', 'tá doido', 'nem pensar'
];

function limparFrase(textoOriginal) {
    let textoFormatado = textoOriginal.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, " ");
    let palavras = textoFormatado.split(/\s+/);
    let palavrasFiltradas = palavras.filter(palavra => !stopWordsList.includes(palavra));
    let resultado = palavrasFiltradas.join(" ").trim();
    return resultado.length > 0 ? resultado : textoOriginal;
}

client.once('ready', () => {
    console.log(`\n======================================================`);
    console.log(`🤖 Ponte TCC Iniciada com Sucesso!`);
    console.log(`🤖 Conectado no Discord como: ${client.user.tag}`);
    console.log(`🔒 Canal restrito ID: ${CANAL_PERMITIDO_ID}`);
    console.log(`======================================================\n`);
});

// ==========================================
// 💬 3. ESCUTANDO O DISCORD
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.channelId !== CANAL_PERMITIDO_ID) return;

    let perguntaUsuario = message.content.trim();
    const usuarioId = message.author.id;

    const numeroDigitado = parseInt(perguntaUsuario);
    let ehNumero = false;

    // Tradutor de Menus (Número para Texto)
    if (!isNaN(numeroDigitado) && memoriaOpcoesUsuarios.has(usuarioId)) {
        const opcoesSalvas = memoriaOpcoesUsuarios.get(usuarioId);
        if (numeroDigitado >= 1 && numeroDigitado <= opcoesSalvas.length) {
            perguntaUsuario = opcoesSalvas[numeroDigitado - 1]; 
            ehNumero = true;
            console.log(`🔢 Conversão de menu: "${numeroDigitado}" alterado para "${perguntaUsuario}".`);
        }
    }

    // 🌟 FILTRO INTELIGENTE DE STOP WORDS
    if (!ehNumero) {
        if (!memoriaOpcoesUsuarios.has(usuarioId)) {
            // Se for a primeira mensagem, é o nome do usuário. Mantemos as maiúsculas intactas.
            console.log(`👤 Preservando formatação original para o nome do usuário: "${perguntaUsuario}"`);
        } else {
            // Se já passou do nome, limpa as stop words e gírias para a busca
            let fraseLimpa = limparFrase(perguntaUsuario);
            
            console.log(`\n======================================================`);
            console.log(`🧹 Frase Original: "${perguntaUsuario}"`);
            console.log(`✨ Frase Filtrada:  "${fraseLimpa}"`);
            
            perguntaUsuario = fraseLimpa; 
        }
    }

    // 📡 GATILHO DA QUERY: EXIBE SEMPRE QUE O DISPARO DE BUSCA FOR ACIONADO
    if (perguntaUsuario.toLowerCase() === "enviar consulta" || (perguntaUsuario.length > 2 && memoriaOpcoesUsuarios.has(usuarioId) && !ehNumero)) {
        console.log(`\n💎 QUERY ENVIADA AO ELASTICSEARCH (QUERY DSL):`);
        console.log(JSON.stringify({
            size: 5,
            query: {
                bool: {
                    must: [
                        {
                            multi_match: {
                                query: perguntaUsuario.toLowerCase() === "enviar consulta" ? "Termos consolidados da busca" : perguntaUsuario,
                                fields: ["texto_da_ata", "conteudo", "ementa"],
                                fuzziness: "AUTO"
                            }
                        }
                    ],
                    filter: [
                        {
                            term: { "status.keyword": "ativo" }
                        }
                    ]
                }
            }
        }, null, 2));
        console.log(`======================================================\n`);
    }

    try {
        const urlBotpress = `http://localhost:${BOTPRESS_PORT}/api/v1/bots/${BOT_ID}/converse/${usuarioId}`;
        
        const response = await axios.post(urlBotpress, { type: 'text', text: perguntaUsuario });

        // ==========================================
        // 📤 4. DEVOLVENDO A RESPOSTA PARA O DISCORD
        // ==========================================
        if (response.data && response.data.responses) {
            for (const res of response.data.responses) {
                
                // Textos simples
                if (res.type === 'text') {
                    if (res.text.includes("I'll be listening") || res.text.includes("I’ll be listening")) continue; 
                    const textoLimpo = res.text.replace(/&#x2F;/g, '/');
                    await message.reply(textoLimpo);
                }
                
                // Menus interativos (Botões/Choices)
                const opcoesBrutas = res.choices || res.options || res.quick_replies;
                if (res.type === 'choice' || opcoesBrutas) {
                    let messageOpcoes = res.text ? `**${res.text}**\n` : "📋 **Escolha uma das opções:**\n";
                    
                    if (Array.isArray(opcoesBrutas) && opcoesBrutas.length > 0) {
                        const listaTitulos = [];
                        opcoesBrutas.forEach((opcao, index) => {
                            const tituloBotao = opcao.title || opcao.label || opcao.text;
                            if (tituloBotao) {
                                messageOpcoes += `\n**${index + 1}️⃣** ${tituloBotao}`;
                                listaTitulos.push(tituloBotao); 
                            }
                        });
                        memoriaOpcoesUsuarios.set(usuarioId, listaTitulos);
                        messageOpcoes += "\n\n_👉 Digite o número correspondente._";
                        await message.reply(messageOpcoes);
                    }
                }
            }
        }
    } catch (error) {
        console.error('⚠️ Erro de comunicação com o Botpress:', error.message);
        await message.reply('❌ Ocorreu um erro ao consultar o assistente.');
    }
});

client.login(DISCORD_TOKEN);