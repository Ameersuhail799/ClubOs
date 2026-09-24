import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { HeadlineMd, BodySm, LabelCode } from "@/components/ui/Typography";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <PageContainer size="narrow" className="text-center flex flex-col items-center gap-4">
        <LabelCode size="md" className="text-secondary">
          ERROR 404 • RECORD NOT FOUND
        </LabelCode>
        <HeadlineMd>Page Not Found</HeadlineMd>
        <BodySm className="max-w-md text-secondary">
          The requested path or institutional ledger item does not exist, or you may lack permissions to view it.
        </BodySm>
        <div className="pt-2 flex items-center gap-3">
          <Link href="/">
            <Button variant="primary" size="md">
              Return Home
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="md">
              Sign In to ClubOS
            </Button>
          </Link>
        </div>
      </PageContainer>
    </div>
  );
}
