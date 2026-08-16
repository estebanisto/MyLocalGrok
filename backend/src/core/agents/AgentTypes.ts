export interface AgentChainOfThought<TAction = any> {
  reflexion: string;
  action?: {
    type: string;
    payload: TAction;
  };
  reponse: string;
}
