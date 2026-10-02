import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Compass className="size-8" aria-hidden="true" />
      </span>
      <h1 className="m-0 text-5xl! font-bold text-foreground">404</h1>
      <p className="m-0 text-muted-foreground">The page you are looking for could not be found.</p>
      <Button asChild>
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  )
}
