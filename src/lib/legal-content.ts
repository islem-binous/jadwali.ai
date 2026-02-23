import {
  Info, Database, Settings, Shield, ExternalLink, Cookie,
  UserCheck, Clock, Users, RefreshCw, Mail,
  CheckCircle, Layers, CreditCard, Wallet, AlertTriangle,
  Copyright, Sparkles, Scale, Wifi, XCircle, Gavel,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface LegalSection {
  id: string
  icon: LucideIcon
}

export const PRIVACY_SECTIONS: LegalSection[] = [
  { id: 'intro', icon: Info },
  { id: 'data_collected', icon: Database },
  { id: 'how_used', icon: Settings },
  { id: 'storage', icon: Shield },
  { id: 'third_party', icon: ExternalLink },
  { id: 'cookies', icon: Cookie },
  { id: 'rights', icon: UserCheck },
  { id: 'retention', icon: Clock },
  { id: 'children', icon: Users },
  { id: 'changes', icon: RefreshCw },
  { id: 'contact', icon: Mail },
]

export const TERMS_SECTIONS: LegalSection[] = [
  { id: 'acceptance', icon: CheckCircle },
  { id: 'service', icon: Layers },
  { id: 'accounts', icon: Users },
  { id: 'plans', icon: CreditCard },
  { id: 'payments', icon: Wallet },
  { id: 'acceptable_use', icon: AlertTriangle },
  { id: 'ip', icon: Copyright },
  { id: 'ai', icon: Sparkles },
  { id: 'liability', icon: Scale },
  { id: 'availability', icon: Wifi },
  { id: 'termination', icon: XCircle },
  { id: 'governing_law', icon: Gavel },
  { id: 'contact', icon: Mail },
]
