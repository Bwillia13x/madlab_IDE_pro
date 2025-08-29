export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            MAD Lab IDE Pro
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Advanced Financial Analysis Platform
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-lg font-semibold mb-2">Real-time Data</h3>
              <p className="text-muted-foreground">
                Live market data integration with multiple providers
              </p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-muted-foreground">
                Comprehensive suite of financial analysis widgets
              </p>
            </div>
            <div className="p-6 bg-card rounded-lg border">
              <h3 className="text-lg font-semibold mb-2">Professional Interface</h3>
              <p className="text-muted-foreground">
                VS Code-like environment for financial analysis
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
