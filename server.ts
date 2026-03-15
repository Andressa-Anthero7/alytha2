import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock Data
  let users = [
    { id: 1, name: "Nix Corretora", email: "nix@agro.com", type: "corretor" },
    { id: 101, name: "João Fazendeiro", email: "joao@fazenda.com", type: "vendedor" },
    { id: 201, name: "Cargill S.A.", email: "compras@cargill.com", type: "comprador" }
  ];

  let offers: any[] = [
    {
      id: 1,
      userId: 101,
      type: "venda",
      grain: "Soja",
      quantity: 5000,
      unit: "Sacas",
      price: 135.50,
      location: "Sorriso - MT",
      crop: "23/24",
      shipping: "FOB",
      quality: { moisture: 14, impurity: 1, broken: 2, damaged: 1 },
      paymentTerms: "30 dias",
      status: "ativa",
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      userId: 201,
      type: "compra",
      grain: "Milho",
      quantity: 10000,
      unit: "Sacas",
      price: 62.00,
      location: "Rio Verde - GO",
      crop: "24/24",
      shipping: "CIF",
      quality: { moisture: 13, impurity: 1, broken: 3, damaged: 2 },
      paymentTerms: "À vista",
      status: "ativa",
      createdAt: new Date().toISOString()
    },
    {
      id: 3,
      userId: 101,
      type: "venda",
      grain: "Milho",
      quantity: 8000,
      unit: "Sacas",
      price: 60.50,
      location: "Sinop - MT",
      crop: "24/24",
      shipping: "FOB",
      quality: { moisture: 13, impurity: 1, broken: 2, damaged: 2 },
      paymentTerms: "À vista",
      status: "ativa",
      createdAt: new Date().toISOString()
    },
    {
      id: 4,
      userId: 201,
      type: "compra",
      grain: "Sorgo",
      quantity: 5000,
      unit: "Sacas",
      price: 45.00,
      location: "Rio Verde - GO",
      crop: "24/24",
      shipping: "FOB",
      quality: { moisture: 14, impurity: 1, broken: 2, damaged: 2 },
      paymentTerms: "30 dias",
      status: "ativa",
      createdAt: new Date().toISOString()
    }
  ];

  let negotiations: any[] = [];

  // API Routes
  app.get("/api/users", (req, res) => res.json(users));

  app.get("/api/offers", (req, res) => {
    const { all } = req.query;
    if (all === 'true') return res.json(offers);
    res.json(offers.filter(o => o.status === 'ativa'));
  });

  app.post("/api/offers", (req, res) => {
    const newOffer = { 
      id: offers.length + 1, 
      createdAt: new Date().toISOString(),
      status: 'ativa',
      ...req.body 
    };
    offers.push(newOffer);
    res.status(201).json(newOffer);
  });

  app.get("/api/negotiations", (req, res) => res.json(negotiations));

  // Match Making Route (Broker Action)
  app.post("/api/negotiations/match", (req, res) => {
    const { buyOfferId, sellOfferId } = req.body;
    const buyOffer = offers.find(o => o.id === buyOfferId);
    const sellOffer = offers.find(o => o.id === sellOfferId);

    if (!buyOffer || !sellOffer) return res.status(404).send("Ofertas não encontradas");

    const newNeg = {
      id: negotiations.length + 1,
      offerId: sellOfferId, // Reference the sell offer
      buyOfferId: buyOfferId,
      buyerId: buyOffer.userId,
      sellerId: sellOffer.userId,
      brokerId: 1,
      proposedPrice: sellOffer.price, // Broker sets the match price
      proposedQuantity: Math.min(buyOffer.quantity, sellOffer.quantity),
      brokerageFee: (sellOffer.price * Math.min(buyOffer.quantity, sellOffer.quantity)) * 0.01,
      status: 'pendente',
      createdAt: new Date().toISOString()
    };

    negotiations.push(newNeg);
    res.status(201).json(newNeg);
  });

  app.patch("/api/negotiations/:id", (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const negIndex = negotiations.findIndex(n => n.id === parseInt(id));
    if (negIndex !== -1) {
      negotiations[negIndex].status = status;
      if (status === 'aceita') {
        const o1 = offers.findIndex(o => o.id === negotiations[negIndex].offerId);
        const o2 = offers.findIndex(o => o.id === negotiations[negIndex].buyOfferId);
        if (o1 !== -1) offers[o1].status = 'finalizada';
        if (o2 !== -1) offers[o2].status = 'finalizada';
      }
      res.json(negotiations[negIndex]);
    } else {
      res.status(404).send("Negociação não encontrada");
    }
  });

  app.delete("/api/offers/:id", (req, res) => {
    const { id } = req.params;
    const offerIndex = offers.findIndex(o => o.id === parseInt(id));
    if (offerIndex !== -1) {
      offers.splice(offerIndex, 1);
      res.status(204).send();
    } else {
      res.status(404).send("Oferta não encontrada");
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const userIndex = users.findIndex(u => u.id === parseInt(id));
    if (userIndex !== -1) {
      users.splice(userIndex, 1);
      res.status(204).send();
    } else {
      res.status(404).send("Usuário não encontrado");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AgroTrade server running on http://localhost:${PORT}`);
  });
}

startServer();
