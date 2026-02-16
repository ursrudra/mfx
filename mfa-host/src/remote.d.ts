// ─── mfa-remote: Landing page sections ──────────────────────────────────────

declare module "mfa-remote/Hero" {
  import type { FC } from "react"
  export const HeroSection: FC
  export default HeroSection
}

declare module "mfa-remote/Features" {
  import type { FC } from "react"
  export const FeaturesSection: FC
  export default FeaturesSection
}

declare module "mfa-remote/Pricing" {
  import type { FC } from "react"
  export const PricingSection: FC
  export default PricingSection
}

declare module "mfa-remote/Testimonials" {
  import type { FC } from "react"
  export const TestimonialsSection: FC
  export default TestimonialsSection
}

declare module "mfa-remote/CTA" {
  import type { FC } from "react"
  export const CTASection: FC
  export default CTASection
}

declare module "mfa-remote/Footer" {
  import type { FC } from "react"
  export const FooterSection: FC
  export default FooterSection
}

declare module "mfa-remote/sections" {
  import type { FC } from "react"
  export const HeroSection: FC
  export const FeaturesSection: FC
  export const PricingSection: FC
  export const TestimonialsSection: FC
  export const CTASection: FC
  export const FooterSection: FC
}

// ─── mfa-ui: Shared component library ───────────────────────────────────────

declare module "mfa-ui/button" {
  import type { ComponentProps, FC } from "react"
  import type { VariantProps } from "class-variance-authority"
  export const buttonVariants: (...args: unknown[]) => string
  export const Button: FC<ComponentProps<"button"> & VariantProps<typeof buttonVariants>>
}

declare module "mfa-ui/switch" {
  import type { ComponentProps, FC } from "react"
  export const Switch: FC<
    ComponentProps<"button"> & {
      checked?: boolean
      onCheckedChange?: (checked: boolean) => void
    }
  >
}

declare module "mfa-ui/badge" {
  import type { ComponentProps, FC } from "react"
  export const Badge: FC<ComponentProps<"span"> & { variant?: string; asChild?: boolean }>
}

declare module "mfa-ui/card" {
  import type { ComponentProps, FC } from "react"
  export const Card: FC<ComponentProps<"div"> & { size?: "default" | "sm" }>
  export const CardHeader: FC<ComponentProps<"div">>
  export const CardTitle: FC<ComponentProps<"div">>
  export const CardDescription: FC<ComponentProps<"div">>
  export const CardAction: FC<ComponentProps<"div">>
  export const CardContent: FC<ComponentProps<"div">>
  export const CardFooter: FC<ComponentProps<"div">>
}

declare module "mfa-ui/input" {
  import type { ComponentProps, FC } from "react"
  export const Input: FC<ComponentProps<"input">>
}

declare module "mfa-ui/separator" {
  import type { FC } from "react"
  export const Separator: FC<{ className?: string; orientation?: string; decorative?: boolean }>
}

declare module "mfa-ui/avatar" {
  import type { ComponentProps, FC } from "react"
  export const Avatar: FC<ComponentProps<"span">>
  export const AvatarImage: FC<ComponentProps<"img">>
  export const AvatarFallback: FC<ComponentProps<"span">>
}

declare module "mfa-ui/label" {
  import type { ComponentProps, FC } from "react"
  export const Label: FC<ComponentProps<"label">>
}

declare module "mfa-ui/textarea" {
  import type { ComponentProps, FC } from "react"
  export const Textarea: FC<ComponentProps<"textarea">>
}

declare module "mfa-ui/select" {
  import type { FC } from "react"
  export const Select: FC<Record<string, unknown>>
  export const SelectTrigger: FC<Record<string, unknown>>
  export const SelectContent: FC<Record<string, unknown>>
  export const SelectItem: FC<Record<string, unknown>>
  export const SelectValue: FC<Record<string, unknown>>
}

declare module "mfa-ui/alert-dialog" {
  import type { FC } from "react"
  export const AlertDialog: FC<Record<string, unknown>>
  export const AlertDialogTrigger: FC<Record<string, unknown>>
  export const AlertDialogContent: FC<Record<string, unknown>>
  export const AlertDialogHeader: FC<Record<string, unknown>>
  export const AlertDialogTitle: FC<Record<string, unknown>>
  export const AlertDialogDescription: FC<Record<string, unknown>>
  export const AlertDialogFooter: FC<Record<string, unknown>>
  export const AlertDialogAction: FC<Record<string, unknown>>
  export const AlertDialogCancel: FC<Record<string, unknown>>
}

declare module "mfa-ui/combobox" {
  import type { FC } from "react"
  export const Combobox: FC<Record<string, unknown>>
}declare module "mfa-ui/dropdown-menu" {
  import type { FC } from "react"
  export const DropdownMenu: FC<Record<string, unknown>>
  export const DropdownMenuTrigger: FC<Record<string, unknown>>
  export const DropdownMenuContent: FC<Record<string, unknown>>
  export const DropdownMenuItem: FC<Record<string, unknown>>
}