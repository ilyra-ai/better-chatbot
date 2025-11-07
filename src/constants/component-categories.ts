export type ComponentCategoryDefinition = {
  id: string;
  label: string;
  description: string;
  directorySegments: string[];
  excludeTopLevel?: string[];
};

export const COMPONENT_CATEGORY_DEFINITIONS: ComponentCategoryDefinition[] = [
  {
    id: "structural",
    label: "Estrutural",
    description:
      "Componentes essenciais compartilhados em toda a aplicação, base da experiência do usuário.",
    directorySegments: [],
    excludeTopLevel: [
      "admin",
      "agent",
      "auth",
      "export",
      "layouts",
      "tool-invocation",
      "ui",
      "user",
    ],
  },
  {
    id: "administrador",
    label: "Administrador",
    description: "Painéis e elementos exclusivos da administração do sistema.",
    directorySegments: ["admin"],
  },
  {
    id: "agentes",
    label: "Agentes",
    description: "Gestão completa dos agentes inteligentes e suas interações.",
    directorySegments: ["agent"],
  },
  {
    id: "autenticacao",
    label: "Autenticação",
    description:
      "Fluxos de entrada, cadastro e segurança de acesso dos usuários.",
    directorySegments: ["auth"],
  },
  {
    id: "exportacao",
    label: "Exportação",
    description:
      "Ferramentas de exportação de dados e históricos da plataforma.",
    directorySegments: ["export"],
  },
  {
    id: "layouts",
    label: "Layouts",
    description:
      "Estruturas visuais completas que organizam páginas e painéis.",
    directorySegments: ["layouts"],
  },
  {
    id: "ferramentas",
    label: "Ferramentas",
    description:
      "Invocações e integrações com ferramentas externas e internas.",
    directorySegments: ["tool-invocation"],
  },
  {
    id: "ui-ux",
    label: "UI / UX",
    description:
      "Biblioteca de componentes visuais reutilizáveis e estilização avançada.",
    directorySegments: ["ui"],
  },
  {
    id: "detalhes-usuarios",
    label: "Detalhes dos Usuários",
    description:
      "Componentes dedicados a perfis, preferências e dados dos usuários.",
    directorySegments: ["user", "user-detail"],
  },
  {
    id: "workflow",
    label: "WorkFlow",
    description:
      "Orquestração e configuração completa dos fluxos de trabalho inteligentes.",
    directorySegments: ["user", "workflow"],
  },
];
