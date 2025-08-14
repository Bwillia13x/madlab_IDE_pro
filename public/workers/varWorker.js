// Web Worker for VaR/ES bootstrap to avoid blocking UI (plain JS)

function mean(arr) {
  var s = 0
  for (var i = 0; i < arr.length; i++) s += arr[i]
  return s / arr.length
}

function quantile(arr, p) {
  var a = arr.slice().sort(function(x, y){ return x - y })
  var rank = (a.length - 1) * p
  var lo = Math.floor(rank)
  var hi = Math.ceil(rank)
  if (lo === hi) return a[lo]
  var w = rank - lo
  return a[lo] * (1 - w) + a[hi] * w
}

function historicalVaR(returns, confidence) {
  var alpha = Math.max(0, Math.min(1, 1 - confidence))
  var q = quantile(returns, alpha)
  return -q
}

function expectedShortfall(returns, confidence) {
  var alpha = Math.max(0, Math.min(1, 1 - confidence))
  var q = quantile(returns, alpha)
  var tail = returns.filter(function(r){ return r <= q })
  if (tail.length === 0) return -q
  return -mean(tail)
}

function bootstrapVaREs(returns, confidence, samples) {
  var n = returns.length
  var valsVar = []
  var valsEs = []
  var valsCf = []
  for (var s = 0; s < samples; s++) {
    var idxs = Array.from({ length: n }, function(){ return Math.floor(Math.random() * n) })
    var boot = idxs.map(function(i){ return returns[i] })
    valsVar.push(historicalVaR(boot, confidence))
    valsEs.push(expectedShortfall(boot, confidence))
    // Simple Cornish-Fisher approximation on sample
    var mean = function(a){ var m=0; for (var i=0;i<a.length;i++) m+=a[i]; return m/a.length }
    var std = function(a){ var m=mean(a); var v=0; for (var i=0;i<a.length;i++){ var d=a[i]-m; v+=d*d } return Math.sqrt(v/Math.max(1,a.length-1)) }
    var skew = function(a){ var m=mean(a); var s=std(a)||1; var n=a.length; var t=0; for (var i=0;i<n;i++){ var z=(a[i]-m)/s; t+=z*z*z } return n<3?0:(n/((n-1)*(n-2)))*t }
    var kurtEx = function(a){ var m=mean(a); var s=std(a)||1; var n=a.length; var t=0; for (var i=0;i<n;i++){ var z=(a[i]-m)/s; t+=z*z*z*z } return n<4?0:((n*(n+1)*t - 3*(n-1)*(n-1)) / ((n-1)*(n-2)*(n-3))) }
    var invNorm = function(p){
      var a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269, -30.66479806614716, 2.506628277459239]
      var b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572]
      var c=[-7.784894002430293e-3,-0.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783]
      var d=[7.784695709041462e-3,0.3224671290700398,2.445134137142996,3.754408661907416]
      var pl=0.02425, ph=1-pl, q, r
      if (p < pl) { q=Math.sqrt(-2*Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1) }
      if (ph < p) { q=Math.sqrt(-2*Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1) }
      q=p-0.5; r=q*q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)
    }
    var alpha = Math.max(0, Math.min(1, 1 - confidence))
    var z = invNorm(alpha)
    var s = skew(boot)
    var k = kurtEx(boot)
    var zAdj = z + (1/6)*(z*z-1)*s + (1/24)*(z*z*z-3*z)*k - (1/36)*(2*z*z*z-5*z)*s*s
    var cf = -(mean(boot) + zAdj * (std(boot)||0))
    valsCf.push(cf)
  }
  var pct = function(arr, p){ return quantile(arr, p) }
  return {
    varHist: historicalVaR(returns, confidence),
    esHist: expectedShortfall(returns, confidence),
    ci: {
      varHist: [pct(valsVar, 0.05), pct(valsVar, 0.95)],
      esHist: [pct(valsEs, 0.05), pct(valsEs, 0.95)],
      varCF: [pct(valsCf, 0.05), pct(valsCf, 0.95)],
    }
  }
}

self.onmessage = function(e) {
  try {
    var data = e.data || {}
    if (data.type !== 'bootstrap') return
    var returns = data.returns
    var confidence = data.confidence
    var samples = data.samples || 500
    if (!Array.isArray(returns) || returns.length < 2) {
      self.postMessage({ type: 'error', message: 'Insufficient returns' })
      return
    }
    var result = bootstrapVaREs(returns, confidence, samples)
    self.postMessage({ type: 'result', data: result })
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message ? err.message : 'Worker error' })
  }
}


