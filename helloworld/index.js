exports.helloWorld = async (req, res) => {
  console.log('start helloWorld function.')

  setTimeout(() => {
    console.log('After 600 sec Hello World!');
  }, 600 * 1000)

  res.send('Hello World!')
}
