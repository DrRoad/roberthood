import { Observable } from 'rx'
import HistoricalData from './historical-data'

export default class EquityHistoricalData extends HistoricalData {
  /** Returns an Observable with a data stream for the portfolio equity */
  static stream$(model$, dataInterval$) {
    const intraday$ = Observable.combineLatest(
      dataInterval$.filter(i => i === '1D'),
      model$.filter(m => m.portfolio && m.portfolio.intradayHistoricals),
      (i, d) => new EquityHistoricalData(d, i).data(d.portfolio.adjusted_equity_previous_close))

    const daily$ = Observable.combineLatest(
      dataInterval$.filter(i => i !== '1D'),
      model$.filter(m => m.portfolio && m.portfolio.dailyHistoricals),
      (i, d) => new EquityHistoricalData(d, i).data())

    return Observable.merge(intraday$, daily$)
  }

  data(previousClose, type = 'line', width = 720, height = 300) {
    return ({
      data: this.dataPoints(),
      prevClose: previousClose,
      displayPrevClose: super.displayPrevClose(),
      selector: '.chart-placeholder',
      type,
      width,
      height,
    })
  }

  /** Returns the percent change for the portfolio equity in the provided time interval */
  percentChange() {
    const lastCoreEquity = this.rawData.portfolio.last_core_equity
    return (this.absChange() / lastCoreEquity) * 100
  }

  absChange() {
    const lastCoreEquity = this.rawData.portfolio.last_core_equity
    if (super.isIntradayInterval()) {
      return lastCoreEquity - this.rawData.portfolio.adjusted_equity_previous_close
    }
    const data = super.filterDataByInterval(this.rawData.portfolio.dailyHistoricals)
    return lastCoreEquity - data[0].adjusted_open_equity
  }

  dataPoints() {
    const dataToFilter = (super.isIntradayInterval()
      ? this.rawData.portfolio.intradayHistoricals
      : this.rawData.portfolio.dailyHistoricals)

    return super.filterDataByInterval(dataToFilter).map(d => {
      d.open_price = d.adjusted_open_equity
      d.close_price = d.adjusted_close_equity
      d.high_price = Math.max(d.adjusted_open_equity, d.adjusted_close_equity)
      d.low_price = Math.min(d.adjusted_open_equity, d.adjusted_close_equity)
      return d
    })
  }
}
