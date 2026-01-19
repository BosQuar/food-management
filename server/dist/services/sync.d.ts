import { WebSocketServer } from "ws";
import { Server } from "http";
import type {
  ProductRow,
  ShoppingItemWithDetails,
  RecipeRow,
} from "../../shared/types.js";
export declare function setupWebSocket(server: Server): WebSocketServer;
export declare function broadcastToUser(
  userId: number,
  type: string,
  data: unknown,
): void;
export declare function broadcastShoppingChange(
  action: string,
  item:
    | ShoppingItemWithDetails
    | {
        id: number;
      }
    | {
        itemsDeleted: number;
      },
  userId: number,
): void;
export declare function broadcastProductChange(
  action: string,
  product:
    | ProductRow
    | {
        id: number;
      },
  userId: number,
): void;
export declare function broadcastRecipeChange(
  action: string,
  recipe:
    | RecipeRow
    | {
        id: number;
      },
  userId: number,
): void;
export declare function getClientCount(): number;
export declare function closeWebSocket(): Promise<void>;
//# sourceMappingURL=sync.d.ts.map
