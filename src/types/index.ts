export type EntityType = 'person' | 'organization' | 'email' | 'url'

export type RelationshipType = 'MENTIONED_IN' | 'RELATED_TO' | 'SENT_TO' | 'CO_OCCURS'

export type DocumentType = 'pdf' | 'txt' | 'md' | 'csv'

export interface Document {
  id: number
  name: string
  type: DocumentType
  content: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface Entity {
  id: number
  name: string
  type: EntityType
  metadata: Record<string, unknown>
  mergedInto: number | null
  mentionCount: number
  createdAt: string
}

export interface DocumentEntity {
  documentId: number
  entityId: number
  mentions: number
  context: string
}

export interface Relationship {
  id: number
  sourceId: number
  targetId: number
  type: RelationshipType
  weight: number
  metadata: Record<string, unknown>
  documentId: number | null
}

export interface GraphNode {
  id: string
  name: string
  type: EntityType | 'document'
  val: number
  color?: string
  mentionCount: number
  metadata?: Record<string, unknown>
}

export interface GraphLink {
  source: string
  target: string
  type: RelationshipType
  weight: number
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphLink[]
}

export interface MergeCandidate {
  entity1: Entity
  entity2: Entity
  similarity: number
  reason: string
}

export interface QueryResult {
  nodes: GraphNode[]
  links: GraphLink[]
  paths?: string[][]
  message?: string
}
